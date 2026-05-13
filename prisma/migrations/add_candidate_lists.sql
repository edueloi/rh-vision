-- Migration to add structured JSON list fields to the candidates table
ALTER TABLE candidates ADD COLUMN experiences_json LONGTEXT;
ALTER TABLE candidates ADD COLUMN education_json LONGTEXT;
ALTER TABLE candidates ADD COLUMN languages_json LONGTEXT;
ALTER TABLE candidates ADD COLUMN projects_json LONGTEXT;
ALTER TABLE candidates ADD COLUMN certifications_json LONGTEXT;
ALTER TABLE candidates ADD COLUMN hard_skills_json LONGTEXT;
ALTER TABLE candidates ADD COLUMN soft_skills_json LONGTEXT;
ALTER TABLE candidates ADD COLUMN objectives_json LONGTEXT;
