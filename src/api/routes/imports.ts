import { Express } from 'express';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import db from '../../lib/db';
import {
  candidateBatchUpload,
  CANDIDATE_BATCH_IMPORT_MAX_FILES,
  CANDIDATE_BATCH_IMPORT_MAX_FILE_SIZE_BYTES,
  CANDIDATE_BATCH_IMPORT_MAX_TOTAL_SIZE_BYTES,
  IMPORT_UPLOADS_DIR,
  bytesToMegabytes,
  getCandidateBatchImportCapacity,
  saveImportedResumeFile,
  fixFilenameLatin1,
  extractResumeTextFromStoredFile,
} from '../helpers/files';
import { createAIClient as createGeminiClient, GEMINI_MODEL } from '../helpers/ai';
import {
  parseJsonFromAiResponseSafe,
  normalizeResumeParsedData,
  buildStructuredResumeBatchPrompt,
  buildCandidateImportNotes,
  attachImportedResumeToCandidate,
  stringifyStructuredListOrNull,
} from '../helpers/resume';

export function registerImportRoutes(app: Express) {
  app.get('/api/imports/dashboard', async (req, res) => {
    const { tenantId } = req.query;
    try {
      const stats = await db.prepare(`
        SELECT
          SUM(total_files) as total_files,
          SUM(processed_files) as processed_files,
          SUM(created_candidates) as created_candidates,
          SUM(duplicate_files) as duplicate_files,
          SUM(error_files) as error_files
        FROM import_batches
        WHERE tenant_id = ?
      `).get(tenantId) as any;

      const monthlyTrend = await db.prepare(`
        SELECT strftime('%Y-%m', created_at) as month, COUNT(*) as count, SUM(total_files) as files
        FROM import_batches
        WHERE tenant_id = ?
        GROUP BY month
        LIMIT 6
      `).all(tenantId);

      res.json({ stats, monthlyTrend });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch import dashboard stats' });
    }
  });

  app.get('/api/imports/capacity', async (_req, res) => {
    res.json(getCandidateBatchImportCapacity());
  });

  app.get('/api/imports', async (req, res) => {
    const { tenantId } = req.query;
    try {
      const batches = await db.prepare(`
        SELECT b.*, j.title as job_title
        FROM import_batches b
        LEFT JOIN jobs j ON b.job_id = j.id
        WHERE b.tenant_id = ?
        ORDER BY b.created_at DESC
      `).all(tenantId);
      res.json(batches);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch imports' });
    }
  });

  app.post('/api/imports', async (req, res) => {
    const { tenant_id, unit_id, name, job_id, import_type, analysis_mode, precision_mode, compatibility_threshold, duplicate_strategy } = req.body;
    try {
      const result = await db.prepare(`
        INSERT INTO import_batches (
          tenant_id, unit_id, name, job_id, import_type, analysis_mode,
          precision_mode, compatibility_threshold, duplicate_strategy, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')
      `).run(
        tenant_id, unit_id, name || `Lote ${new Date().toLocaleDateString()}`,
        job_id || null, import_type || 'mixed', analysis_mode || 'full',
        precision_mode || 'Equilibrada', compatibility_threshold || 70, duplicate_strategy || 'manual'
      );
      res.json({ id: result.lastInsertRowid, success: true });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to create import batch' });
    }
  });

  app.get('/api/imports/:id', async (req, res) => {
    try {
      const batch = await db.prepare(`
        SELECT b.*, j.title as job_title, j.description as job_description
        FROM import_batches b
        LEFT JOIN jobs j ON b.job_id = j.id
        WHERE b.id = ?
      `).get(req.params.id);

      const files = await db.prepare('SELECT * FROM import_files WHERE batch_id = ?').all(req.params.id);

      res.json({ ...batch as any, files });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch batch details' });
    }
  });

  app.post('/api/imports/:id/files', (req, res) => {
    candidateBatchUpload.array('files', CANDIDATE_BATCH_IMPORT_MAX_FILES)(req, res, async (uploadError: any) => {
      if (uploadError instanceof multer.MulterError) {
        if (uploadError.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({
            error: `Cada currículo pode ter até ${bytesToMegabytes(CANDIDATE_BATCH_IMPORT_MAX_FILE_SIZE_BYTES)} MB.`,
          });
        }

        if (uploadError.code === 'LIMIT_FILE_COUNT') {
          return res.status(400).json({
            error: `Cada lote aceita até ${CANDIDATE_BATCH_IMPORT_MAX_FILES} currículos.`,
          });
        }

        return res.status(400).json({ error: uploadError.message });
      }

      if (uploadError) {
        return res.status(400).json({ error: uploadError.message || 'Falha ao validar arquivos do lote.' });
      }

      try {
        const batchId = req.params.id;
        const batch = await db.prepare('SELECT id, tenant_id, unit_id, total_files, status FROM import_batches WHERE id = ?').get(batchId) as any;
        const files = (req.files as any[]) || [];

        if (!batch) {
          return res.status(404).json({ error: 'Batch not found' });
        }

        if (batch.status === 'processing') {
          return res.status(409).json({ error: 'O lote está sendo processado agora. Aguarde terminar.' });
        }

        if (batch.status === 'completed' || batch.status === 'committed') {
          await db.prepare("UPDATE import_batches SET status = 'pending' WHERE id = ?").run(batchId);
        }

        if (files.length === 0) {
          return res.status(400).json({ error: 'Nenhum arquivo enviado' });
        }

        const existingFilesCount = Number(batch.total_files || 0);
        const existingSizeRow = await db.prepare('SELECT COALESCE(SUM(file_size), 0) as total_size FROM import_files WHERE batch_id = ?').get(batchId) as any;
        if (existingFilesCount + files.length > CANDIDATE_BATCH_IMPORT_MAX_FILES) {
          return res.status(400).json({
            error: `O lote pode conter no máximo ${CANDIDATE_BATCH_IMPORT_MAX_FILES} currículos.`,
          });
        }

        const totalBytes = files.reduce((sum: number, file: any) => sum + Number(file.size || 0), 0);
        const cumulativeBytes = Number(existingSizeRow?.total_size || 0) + totalBytes;
        if (cumulativeBytes > CANDIDATE_BATCH_IMPORT_MAX_TOTAL_SIZE_BYTES) {
          return res.status(400).json({
            error: `O lote pode acumular até ${bytesToMegabytes(CANDIDATE_BATCH_IMPORT_MAX_TOTAL_SIZE_BYTES)} MB no total.`,
          });
        }

        for (const file of files) {
          const filePath = await saveImportedResumeFile(batchId, batch.tenant_id, file);
          const displayName = fixFilenameLatin1(file.originalname);
          await db.prepare(`
            INSERT INTO import_files (batch_id, tenant_id, unit_id, file_name, file_path, file_type, file_size, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, 'uploaded')
          `).run(batchId, batch.tenant_id, batch.unit_id, displayName, filePath, file.mimetype, file.size);
        }

        await db.prepare('UPDATE import_batches SET total_files = total_files + ? WHERE id = ?').run(files.length, batchId);

        res.json({
          success: true,
          capacity: getCandidateBatchImportCapacity(),
        });
      } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to add files to batch' });
      }
    });
  });

  app.post('/api/imports/:id/start', async (req, res) => {
    const batchId = req.params.id;
    try {
      const batch = await db.prepare(`
        SELECT b.*, j.title as job_title, j.description as job_description
        FROM import_batches b
        LEFT JOIN jobs j ON b.job_id = j.id
        WHERE b.id = ?
      `).get(batchId) as any;

      const files = await db.prepare("SELECT * FROM import_files WHERE batch_id = ? AND status = 'uploaded'").all(batchId) as any[];

      await db.prepare("UPDATE import_batches SET status = 'processing', updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(batchId);

      res.json({ success: true, message: 'Processamento iniciado em segundo plano' });

      (async () => {
        const ai = createGeminiClient();
        const CONCURRENCY = 8;

        const processFile = async (file: any) => {
          try {
            await db.prepare("UPDATE import_files SET status = 'processing', progress = 10, duplicate_status = 'none', duplicate_candidate_id = NULL, error_message = NULL WHERE id = ?").run(file.id);

            const extractedText = await extractResumeTextFromStoredFile(file);
            const prompt = buildStructuredResumeBatchPrompt(extractedText, {
              job_title: batch.job_title,
              job_description: batch.job_description,
            });

            try {
              const aiResult = await ai.models.generateContent({
                model: GEMINI_MODEL,
                contents: [{ role: 'user', parts: [{ text: prompt }] }],
                config: {
                  responseMimeType: 'application/json',
                  temperature: 0.2,
                  maxOutputTokens: 2600,
                  reasoningEffort: 'medium',
                  operationLabel: 'pré-análise em lote',
                }
              });

              const data = normalizeResumeParsedData(
                parseJsonFromAiResponseSafe(aiResult.text || '{}'),
                Boolean(batch.job_title || batch.job_description)
              );

              const existing = data.email
                ? await db.prepare('SELECT id FROM candidates WHERE email = ? AND tenant_id = ? AND deleted_at IS NULL').get(data.email, batch.tenant_id) as any
                : null;

              const status = existing ? 'duplicate' : 'completed';
              const duplicateStatus = existing ? 'email' : 'none';
              const duplicateCandidateId = existing ? existing.id : null;

              await db.prepare(`
                UPDATE import_files
                SET status = ?,
                    progress = 100,
                    extracted_text = ?,
                    parsed_data_json = ?,
                    ai_summary = ?,
                    duplicate_status = ?,
                    duplicate_candidate_id = ?,
                    compatibility_score = ?,
                    compatibility_classification = ?,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
              `).run(
                status, extractedText, JSON.stringify(data), data.summary,
                duplicateStatus, duplicateCandidateId,
                data.compatibility_score, data.recommendation, file.id
              );

              await db.prepare(`
                UPDATE import_batches
                SET processed_files = processed_files + 1,
                    duplicate_files = duplicate_files + ${duplicateStatus !== 'none' ? 1 : 0},
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
              `).run(batchId);

            } catch (err: any) {
              console.error(`AI Error for file ${file.id}:`, err);
              await db.prepare("UPDATE import_files SET status = 'error', error_message = ? WHERE id = ?").run(err.message || String(err), file.id);
              await db.prepare('UPDATE import_batches SET processed_files = processed_files + 1, error_files = error_files + 1 WHERE id = ?').run(batchId);
            }
          } catch (err) {
            console.error(`Extraction error for file ${file.id}:`, err);
            await db.prepare("UPDATE import_files SET status = 'error', error_message = ? WHERE id = ?").run(String(err), file.id);
            await db.prepare('UPDATE import_batches SET processed_files = processed_files + 1, error_files = error_files + 1 WHERE id = ?').run(batchId);
          }
        };

        try {
          for (let i = 0; i < files.length; i += CONCURRENCY) {
            const chunk = files.slice(i, i + CONCURRENCY);
            await Promise.all(chunk.map(processFile));
          }
        } catch (criticalError) {
          console.error("Critical background processing error:", criticalError);
        } finally {
          await db.prepare("UPDATE import_batches SET status = 'completed', updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(batchId);
        }

        // Auto-commit
        try {
          const filesToCommit = await db.prepare("SELECT * FROM import_files WHERE batch_id = ? AND status IN ('completed', 'duplicate')").all(batchId) as any[];
          const batchData = await db.prepare('SELECT * FROM import_batches WHERE id = ?').get(batchId) as any;

          for (const file of filesToCommit) {
            try {
              if (!file.parsed_data_json) continue;
              const data = JSON.parse(file.parsed_data_json);
              const hardSkillsText = Array.isArray(data.skills) ? data.skills.join(', ') : null;
              const softSkillsText = Array.isArray(data.soft_skills) ? data.soft_skills.join(', ') : null;
              const languagesText = Array.isArray(data.languages) ? data.languages.join(', ') : null;
              const experiencesJson = stringifyStructuredListOrNull(data.experiences_list);
              const educationJson = stringifyStructuredListOrNull(data.education_list);
              const certificationsJson = stringifyStructuredListOrNull(data.certifications_list);
              const projectsJson = stringifyStructuredListOrNull(data.projects_list);
              const languagesJson = stringifyStructuredListOrNull(data.languages_list);
              const hardSkillsJson = stringifyStructuredListOrNull(data.skills);
              const softSkillsJson = stringifyStructuredListOrNull(data.soft_skills);
              const objectivesJson = stringifyStructuredListOrNull(data.objectives_list);

              if (file.status === 'completed') {
                if (!data?.name || !data?.email) {
                  await db.prepare('UPDATE import_files SET error_message = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
                    .run('Nome e e-mail são obrigatórios para concluir o cadastro.', file.id);
                  continue;
                }

                const candRes = await db.prepare(`
                  INSERT INTO candidates (
                    tenant_id, unit_id, full_name, email, phone, city, state,
                    desired_position, professional_summary, experience_years, hard_skills,
                    education_level, languages, linkedin_url, portfolio_url, source, status
                  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Importação em Massa', 'Novo')
                `).run(
                  file.tenant_id, file.unit_id, data.name, data.email, data.phone, data.city, data.state,
                  data.role, data.summary, data.experience_years, hardSkillsText,
                  data.education_level, languagesText, data.linkedin_url, data.portfolio_url
                );

                const candId = candRes.lastInsertRowid;

                await db.prepare(`
                  UPDATE candidates SET
                    cpf=?,birth_date=?,address=?,desired_area=?,desired_salary=?,
                    professional_experiences=?,academic_education=?,courses_certifications=?,
                    soft_skills=?,experiences_json=?,education_json=?,certifications_json=?,
                    projects_json=?,languages_json=?,hard_skills_json=?,soft_skills_json=?,
                    objectives_json=?,has_cnh=?,cnh_category=?,available_to_travel=?,
                    available_to_relocate=?,desired_work_model=?,desired_contract_type=?,
                    internal_notes=?,updated_at=CURRENT_TIMESTAMP
                  WHERE id=?
                `).run(
                  data.cpf,data.birth_date,data.address,data.desired_area,data.desired_salary,
                  data.professional_experiences,data.academic_education,data.courses_certifications,
                  softSkillsText,experiencesJson,educationJson,certificationsJson,
                  projectsJson,languagesJson,hardSkillsJson,softSkillsJson,objectivesJson,
                  data.has_cnh===null?false:Boolean(data.has_cnh),data.cnh_category,
                  data.available_to_travel===null?false:Boolean(data.available_to_travel),
                  data.available_to_relocate===null?false:Boolean(data.available_to_relocate),
                  data.desired_work_model,data.desired_contract_type,
                  buildCandidateImportNotes(data),candId
                );

                await attachImportedResumeToCandidate(candId, file);

                if (batchData?.job_id) {
                  await db.prepare(`
                    INSERT INTO candidate_job_matches (candidate_id, job_id, compatibility_score, classification, status)
                    VALUES (?, ?, ?, ?, 'Triagem')
                  `).run(candId, batchData.job_id, file.compatibility_score, file.compatibility_classification);
                }

                await db.prepare('UPDATE import_files SET candidate_id = ?, status = "committed", error_message = NULL WHERE id = ?').run(candId, file.id);
                await db.prepare('UPDATE import_batches SET created_candidates = created_candidates + 1 WHERE id = ?').run(batchId);

              } else if (file.status === 'duplicate' && batchData?.duplicate_strategy === 'update') {
                await db.prepare(`
                  UPDATE candidates SET full_name=?,phone=?,city=?,state=?,professional_summary=?,
                    desired_position=?,experience_years=?,hard_skills=?,education_level=?,
                    languages=?,linkedin_url=?,portfolio_url=?,updated_at=CURRENT_TIMESTAMP
                  WHERE id=?
                `).run(
                  data.name,data.phone,data.city,data.state,data.summary,data.role,
                  data.experience_years,hardSkillsText,data.education_level,languagesText,
                  data.linkedin_url,data.portfolio_url,file.duplicate_candidate_id
                );

                await attachImportedResumeToCandidate(file.duplicate_candidate_id, file);
                await db.prepare('UPDATE import_files SET candidate_id = ?, status = "committed", error_message = NULL WHERE id = ?').run(file.duplicate_candidate_id, file.id);
                await db.prepare('UPDATE import_batches SET updated_candidates = updated_candidates + 1 WHERE id = ?').run(batchId);
              }
            } catch (fileErr) {
              console.error(`[auto-commit] Error for file ${file.id}:`, fileErr);
              await db.prepare('UPDATE import_files SET error_message = ? WHERE id = ?').run(String(fileErr), file.id);
            }
          }

          await db.prepare("UPDATE import_batches SET status = 'committed', updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(batchId);
          console.log(`[auto-commit] Batch ${batchId} committed automatically.`);
        } catch (commitErr) {
          console.error(`[auto-commit] Failed for batch ${batchId}:`, commitErr);
        }
      })().catch(err => console.error("Critical background error:", err));

    } catch (error) {
      console.error(error);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Failed to start processing' });
      }
    }
  });

  app.post('/api/imports/files/:id/reprocess', async (req, res) => {
    const fileId = req.params.id;
    try {
      const file = await db.prepare('SELECT * FROM import_files WHERE id = ?').get(fileId) as any;
      if (!file) return res.status(404).json({ error: 'File not found' });

      const batch = await db.prepare(`
        SELECT b.*, j.title as job_title, j.description as job_description
        FROM import_batches b
        LEFT JOIN jobs j ON b.job_id = j.id
        WHERE b.id = ?
      `).get(file.batch_id) as any;

      await db.prepare("UPDATE import_files SET status = 'uploaded' WHERE id = ?").run(fileId);

      res.json({ success: true, message: 'Reprocessamento iniciado' });

      (async () => {
        const ai = createGeminiClient();
        await db.prepare("UPDATE import_files SET status = 'processing', progress = 10, duplicate_status = 'none', duplicate_candidate_id = NULL, error_message = NULL WHERE id = ?").run(fileId);

        const extractedText = await extractResumeTextFromStoredFile(file);
        const prompt = buildStructuredResumeBatchPrompt(extractedText, {
          job_title: batch.job_title,
          job_description: batch.job_description,
        });

        try {
          const aiResult = await ai.models.generateContent({
            model: GEMINI_MODEL,
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            config: {
              responseMimeType: 'application/json',
              temperature: 0.2,
              maxOutputTokens: 2600,
              reasoningEffort: 'medium',
              operationLabel: 'reprocessamento de pré-análise',
            }
          });
          const data = normalizeResumeParsedData(
            parseJsonFromAiResponseSafe(aiResult.text || '{}'),
            Boolean(batch.job_title || batch.job_description)
          );

          const existing = data.email
            ? await db.prepare('SELECT id FROM candidates WHERE email = ? AND tenant_id = ? AND deleted_at IS NULL').get(data.email, batch.tenant_id) as any
            : null;
          let status = 'completed';
          let duplicateStatus = 'none';
          let duplicateCandidateId = null;

          if (existing) {
            status = 'duplicate';
            duplicateStatus = 'email';
            duplicateCandidateId = existing.id;
          }

          await db.prepare(`
            UPDATE import_files
            SET status = ?, progress = 100, extracted_text = ?, parsed_data_json = ?, ai_summary = ?,
                duplicate_status = ?, duplicate_candidate_id = ?, compatibility_score = ?, compatibility_classification = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
          `).run(
            status,
            extractedText,
            JSON.stringify(data),
            data.summary,
            duplicateStatus,
            duplicateCandidateId,
            data.compatibility_score,
            data.recommendation,
            fileId
          );

          await db.prepare("UPDATE import_batches SET processed_files = (SELECT COUNT(*) FROM import_files WHERE batch_id = ? AND status IN ('completed', 'duplicate', 'error')), updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(file.batch_id, file.batch_id);
        } catch (err: any) {
          await db.prepare("UPDATE import_files SET status = 'error', error_message = ? WHERE id = ?").run(err.message, fileId);
        }
      })();

    } catch (error) {
      res.status(500).json({ error: 'Failed to reprocess file' });
    }
  });

  app.delete('/api/imports/files/:id', async (req, res) => {
    const fileId = req.params.id;
    try {
      const file = await db.prepare('SELECT * FROM import_files WHERE id = ?').get(fileId) as any;
      if (!file) return res.status(404).json({ error: 'File not found' });

      if (file.file_path && fs.existsSync(file.file_path)) {
        await fs.promises.unlink(file.file_path);
      }

      await db.prepare('DELETE FROM import_files WHERE id = ?').run(fileId);
      await db.prepare('UPDATE import_batches SET total_files = total_files - 1 WHERE id = ?').run(file.batch_id);

      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete file' });
    }
  });

  app.patch('/api/imports/files/:id', async (req, res) => {
    const { id } = req.params;
    const { parsed_data_json } = req.body;
    try {
      await db.prepare('UPDATE import_files SET parsed_data_json = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(parsed_data_json, id);
      res.json({ success: true });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to update file data' });
    }
  });

  app.delete('/api/imports/:id', async (req, res) => {
    const batchId = req.params.id;
    try {
      const batch = await db.prepare('SELECT tenant_id FROM import_batches WHERE id = ?').get(batchId) as any;
      if (!batch) return res.status(404).json({ error: 'Batch not found' });

      const files = await db.prepare('SELECT file_path FROM import_files WHERE batch_id = ?').all(batchId) as any[];
      for (const file of files) {
        if (file.file_path && fs.existsSync(file.file_path)) {
          await fs.promises.unlink(file.file_path).catch(() => {});
        }
      }

      const batchDir = path.join(IMPORT_UPLOADS_DIR, batch.tenant_id, String(batchId));
      if (fs.existsSync(batchDir)) {
        await fs.promises.rm(batchDir, { recursive: true, force: true }).catch(() => {});
      }

      await db.prepare('DELETE FROM import_files WHERE batch_id = ?').run(batchId);
      await db.prepare('DELETE FROM import_batches WHERE id = ?').run(batchId);

      res.json({ success: true });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to delete batch' });
    }
  });

  app.post('/api/imports/:id/commit', async (req, res) => {
    const batchId = req.params.id;
    try {
      const files = await db.prepare("SELECT * FROM import_files WHERE batch_id = ? AND status IN ('completed', 'duplicate')").all(batchId) as any[];
      const batch = await db.prepare('SELECT * FROM import_batches WHERE id = ?').get(batchId) as any;

      console.log(`Starting commit for batch ${batchId}. Files found to commit: ${files.length}`);
      for (const file of files) {
        try {
          console.log(`Processing commit for file ${file.id}: ${file.file_name}`);
          if (!file.parsed_data_json) {
            console.warn(`File ${file.id} has no parsed data, skipping.`);
            continue;
          }
          const data = JSON.parse(file.parsed_data_json);
          const hardSkillsText = Array.isArray(data.skills) ? data.skills.join(', ') : null;
          const softSkillsText = Array.isArray(data.soft_skills) ? data.soft_skills.join(', ') : null;
          const languagesText = Array.isArray(data.languages) ? data.languages.join(', ') : null;
          const experiencesJson = stringifyStructuredListOrNull(data.experiences_list);
          const educationJson = stringifyStructuredListOrNull(data.education_list);
          const certificationsJson = stringifyStructuredListOrNull(data.certifications_list);
          const projectsJson = stringifyStructuredListOrNull(data.projects_list);
          const languagesJson = stringifyStructuredListOrNull(data.languages_list);
          const hardSkillsJson = stringifyStructuredListOrNull(data.skills);
          const softSkillsJson = stringifyStructuredListOrNull(data.soft_skills);
          const objectivesJson = stringifyStructuredListOrNull(data.objectives_list);

          if (file.status === 'completed') {
            if (!data?.name || !data?.email) {
              await db.prepare(`
                UPDATE import_files
                SET error_message = ?, updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
              `).run('Revisar pré-análise: nome e e-mail são obrigatórios para concluir o cadastro.', file.id);
              continue;
            }

            const importNotes = buildCandidateImportNotes(data);

            const candRes = await db.prepare(`
              INSERT INTO candidates (
                tenant_id, unit_id, full_name, email, phone, city, state,
                desired_position, professional_summary, experience_years, hard_skills,
                education_level, languages, linkedin_url, portfolio_url, source, status
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Importação em Massa', 'Novo')
            `).run(
              file.tenant_id, file.unit_id, data.name, data.email, data.phone, data.city, data.state,
              data.role, data.summary, data.experience_years, hardSkillsText, data.education_level,
              languagesText, data.linkedin_url, data.portfolio_url
            );

            const candId = candRes.lastInsertRowid;

            await db.prepare(`
              UPDATE candidates
              SET cpf = ?, birth_date = ?, address = ?, desired_area = ?, desired_salary = ?,
                  professional_experiences = ?, academic_education = ?, courses_certifications = ?,
                  soft_skills = ?, experiences_json = ?, education_json = ?, certifications_json = ?,
                  projects_json = ?, languages_json = ?, hard_skills_json = ?, soft_skills_json = ?,
                  objectives_json = ?, has_cnh = ?, cnh_category = ?, available_to_travel = ?,
                  available_to_relocate = ?, desired_work_model = ?, desired_contract_type = ?,
                  internal_notes = ?, updated_at = CURRENT_TIMESTAMP
              WHERE id = ?
            `).run(
              data.cpf, data.birth_date, data.address, data.desired_area, data.desired_salary,
              data.professional_experiences, data.academic_education, data.courses_certifications,
              softSkillsText, experiencesJson, educationJson, certificationsJson,
              projectsJson, languagesJson, hardSkillsJson, softSkillsJson, objectivesJson,
              data.has_cnh === null ? false : Boolean(data.has_cnh),
              data.cnh_category,
              data.available_to_travel === null ? false : Boolean(data.available_to_travel),
              data.available_to_relocate === null ? false : Boolean(data.available_to_relocate),
              data.desired_work_model, data.desired_contract_type, importNotes, candId
            );

            await attachImportedResumeToCandidate(candId, file);

            if (batch.job_id) {
              await db.prepare(`
                INSERT INTO candidate_job_matches (candidate_id, job_id, compatibility_score, classification, status)
                VALUES (?, ?, ?, ?, 'Triagem')
              `).run(candId, batch.job_id, file.compatibility_score, file.compatibility_classification);
            }

            const autoToolId = req.body.autoToolId;
            if (autoToolId && autoToolId !== 'none') {
              await db.prepare(`
                INSERT INTO hr_tool_responses (tool_id, candidate_id, tenant_id, status)
                VALUES (?, ?, ?, 'Pendente')
              `).run(autoToolId, candId, file.tenant_id);
            }

            await db.prepare('UPDATE import_files SET candidate_id = ?, status = "committed", error_message = NULL WHERE id = ?').run(candId, file.id);
            await db.prepare('UPDATE import_batches SET created_candidates = created_candidates + 1 WHERE id = ?').run(batchId);
          }
          else if (file.status === 'duplicate' && batch.duplicate_strategy === 'update') {
            await db.prepare(`
              UPDATE candidates
              SET full_name = ?, phone = ?, city = ?, state = ?, professional_summary = ?,
                  desired_position = ?, experience_years = ?, hard_skills = ?, education_level = ?,
                  languages = ?, linkedin_url = ?, portfolio_url = ?, updated_at = CURRENT_TIMESTAMP
              WHERE id = ?
            `).run(
              data.name, data.phone, data.city, data.state, data.summary, data.role,
              data.experience_years, hardSkillsText, data.education_level, languagesText,
              data.linkedin_url, data.portfolio_url, file.duplicate_candidate_id
            );

            await db.prepare(`
              UPDATE candidates
              SET cpf = COALESCE(?, cpf), birth_date = COALESCE(?, birth_date),
                  address = COALESCE(?, address), desired_area = COALESCE(?, desired_area),
                  desired_salary = COALESCE(?, desired_salary),
                  professional_experiences = COALESCE(?, professional_experiences),
                  academic_education = COALESCE(?, academic_education),
                  courses_certifications = COALESCE(?, courses_certifications),
                  soft_skills = COALESCE(?, soft_skills), experiences_json = COALESCE(?, experiences_json),
                  education_json = COALESCE(?, education_json), certifications_json = COALESCE(?, certifications_json),
                  projects_json = COALESCE(?, projects_json), languages_json = COALESCE(?, languages_json),
                  hard_skills_json = COALESCE(?, hard_skills_json), soft_skills_json = COALESCE(?, soft_skills_json),
                  objectives_json = COALESCE(?, objectives_json), has_cnh = COALESCE(?, has_cnh),
                  cnh_category = COALESCE(?, cnh_category), available_to_travel = COALESCE(?, available_to_travel),
                  available_to_relocate = COALESCE(?, available_to_relocate),
                  desired_work_model = COALESCE(?, desired_work_model),
                  desired_contract_type = COALESCE(?, desired_contract_type),
                  internal_notes = COALESCE(?, internal_notes), updated_at = CURRENT_TIMESTAMP
              WHERE id = ?
            `).run(
              data.cpf, data.birth_date, data.address, data.desired_area, data.desired_salary,
              data.professional_experiences, data.academic_education, data.courses_certifications,
              softSkillsText, experiencesJson, educationJson, certificationsJson,
              projectsJson, languagesJson, hardSkillsJson, softSkillsJson, objectivesJson,
              data.has_cnh, data.cnh_category, data.available_to_travel, data.available_to_relocate,
              data.desired_work_model, data.desired_contract_type, buildCandidateImportNotes(data),
              file.duplicate_candidate_id
            );

            await attachImportedResumeToCandidate(file.duplicate_candidate_id, file);
            await db.prepare('UPDATE import_files SET candidate_id = ?, status = "committed", error_message = NULL WHERE id = ?').run(file.duplicate_candidate_id, file.id);
            await db.prepare('UPDATE import_batches SET updated_candidates = updated_candidates + 1 WHERE id = ?').run(batchId);
          }
        } catch (fileError) {
          console.error(`Error committing file ${file.id}:`, fileError);
          await db.prepare('UPDATE import_files SET error_message = ? WHERE id = ?').run(String(fileError), file.id);
        }
      }

      await db.prepare("UPDATE import_batches SET status = 'committed', updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(batchId);

      res.json({ success: true });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Commit failed' });
    }
  });

  app.post('/api/ai/match-jobs', async (req, res) => {
    const { candidateProfile, tenantId } = req.body;
    try {
      const activeJobs = await db.prepare("SELECT id, title, description, city, state FROM jobs WHERE tenant_id = ? AND status = 'Aberta'").all(tenantId) as any[];

      if (activeJobs.length === 0) return res.json({ suggestions: [] });

      const ai = createGeminiClient();

      const prompt = `
        Olá, eu sou Aurora, a Inteligência Artificial especialista em talentos da Develoi.
        Minha missão hoje é analisar o perfil do candidato abaixo e encontrar as melhores oportunidades entre nossas vagas abertas.

        PERFIL DO CANDIDATO:
        ${JSON.stringify(candidateProfile)}

        VAGAS DISPONÍVEIS:
        ${JSON.stringify(activeJobs)}

        Por favor, selecione as vagas com maior afinidade (mínimo de 60%) e justifique brevemente sua escolha.
        Retorne APENAS o JSON no seguinte formato:
        {
          "suggestions": [
            { "job_id": number, "match_reason": "breve justificativa (máx 15 palavras)", "score": number (0-100) }
          ]
        }
      `;

      const response = await ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          maxOutputTokens: 900,
          reasoningEffort: 'medium',
          operationLabel: 'sugestão de vagas por IA',
        }
      });

      const text = response.text || "{}";
      const match = text.match(/\{[\s\S]*\}/);
      const data = match ? JSON.parse(match[0]) : { suggestions: [] };

      res.json(data);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'AI matching failed' });
    }
  });
}
