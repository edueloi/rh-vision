const fs = require('fs');
const content = fs.readFileSync('c:\\Users\\Eduardo\\Desktop\\rh-vision\\src\\pages\\ImportResumes.tsx', 'utf8');

function countTags(text, tag) {
    const opening = (text.match(new RegExp(`<${tag}[\\s>]`, 'g')) || []).length;
    const closing = (text.match(new RegExp(`</${tag}>`, 'g')) || []).length;
    const selfClosing = (text.match(new RegExp(`<${tag}[^>]*/>`, 'g')) || []).length;
    return { opening, closing, selfClosing, totalOpening: opening + selfClosing };
}

['div', 'section', 'PanelCard', 'ContentCard', 'Badge', 'Button', 'IconButton', 'Select', 'Input', 'Modal', 'PageWrapper', 'motion.div', 'AnimatePresence'].forEach(tag => {
    const counts = countTags(content, tag);
    console.log(`${tag}: Open=${counts.opening}, Close=${counts.closing}, SelfClose=${counts.selfClosing}`);
});
