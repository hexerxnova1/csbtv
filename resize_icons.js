const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const assetsDir = path.join(__dirname, 'assets');

async function resizeIcon(filename, scaleFactor, bg) {
    const filePath = path.join(assetsDir, filename);
    const backupPath = path.join(assetsDir, filename + '.bak');
    
    // Backup if not already backed up
    if (!fs.existsSync(backupPath)) {
        fs.copyFileSync(filePath, backupPath);
        console.log(`Created backup: ${filename}.bak`);
    }
    
    // Read from backup
    const image = sharp(backupPath);
    const meta = await image.metadata();
    
    const targetSize = Math.round(meta.width * scaleFactor);
    const padding = Math.round((meta.width - targetSize) / 2);
    
    await sharp(backupPath)
        .resize(targetSize, targetSize)
        .extend({
            top: padding,
            bottom: padding,
            left: padding,
            right: padding,
            background: bg
        })
        .resize(meta.width, meta.height) // ensure exact size match
        .toFile(filePath);
        
    console.log(`Resized ${filename} to ${scaleFactor * 100}% of original size.`);
}

async function main() {
    try {
        const transparent = { r: 0, g: 0, b: 0, alpha: 0 };
        const white = { r: 255, g: 255, b: 255, alpha: 1 };
        
        await resizeIcon('icon-foreground.png', 0.65, transparent);
        await resizeIcon('logo.png', 0.65, transparent);
        await resizeIcon('logo-dark.png', 0.65, transparent);
        await resizeIcon('icon-only.png', 0.65, white);
        
        console.log('All icons successfully resized!');
    } catch (err) {
        console.error('Error resizing icons:', err);
    }
}

main();
