const fs = require('fs-extra');
const path = require('path');

async function postBuild() {
  console.log('Running post-build tasks...');

  // Copy HTML and CSS files
  const rendererSrc = path.join(__dirname, '../src/renderer');
  const rendererDist = path.join(__dirname, '../dist/renderer');

  await fs.ensureDir(rendererDist);

  // Copy HTML
  await fs.copy(
    path.join(rendererSrc, 'index.html'),
    path.join(rendererDist, 'index.html')
  );
  console.log('✓ Copied index.html');

  // Copy CSS
  await fs.copy(
    path.join(rendererSrc, 'styles.css'),
    path.join(rendererDist, 'styles.css')
  );
  console.log('✓ Copied styles.css');

  // Copy assets folder (icons, images, wordpress-base)
  const assetsSrc = path.join(__dirname, '../assets');
  const assetsDist = path.join(__dirname, '../dist/assets');

  // Ensure dist/assets exists
  await fs.ensureDir(assetsDist);

  // Copy logo and favicon
  await fs.copy(
    path.join(assetsSrc, 'logo.png'),
    path.join(assetsDist, 'logo.png')
  );
  console.log('✓ Copied logo.png');

  await fs.copy(
    path.join(assetsSrc, 'favicon.png'),
    path.join(assetsDist, 'favicon.png')
  );
  console.log('✓ Copied favicon.png');

  // Copy wordpress-base folder if it exists
  const wpBaseSrc = path.join(assetsSrc, 'wordpress-base');
  const wpBaseDist = path.join(assetsDist, 'wordpress-base');

  if (await fs.pathExists(wpBaseSrc)) {
    await fs.copy(wpBaseSrc, wpBaseDist);
    console.log('✓ Copied wordpress-base folder');
  } else {
    console.log('⚠ wordpress-base folder not found, skipping...');
  }

  console.log('Post-build completed!');
}

postBuild().catch(err => {
  console.error('Post-build failed:', err);
  process.exit(1);
});
