import * as fs from 'fs-extra';
import * as path from 'path';
import { ServiceResult } from '../types';

class CopyService {
  /**
   * Copy WordPress base directory to destination
   * @param sourcePath - Path to wordpress-base
   * @param destPath - Destination path for new project
   */
  async copyWordPress(sourcePath: string, destPath: string): Promise<ServiceResult> {
    console.log('[COPY] Starting WordPress copy operation');
    console.log('[COPY] Source:', sourcePath);
    console.log('[COPY] Destination:', destPath);

    try {
      // Check if source exists
      console.log('[COPY] Checking if source exists...');
      const sourceExists = await fs.pathExists(sourcePath);
      if (!sourceExists) {
        console.error('[COPY] Source directory does not exist:', sourcePath);
        throw new Error(`Le dossier source n'existe pas: ${sourcePath}`);
      }
      console.log('[COPY] Source exists ✓');

      // Check if destination already exists
      console.log('[COPY] Checking if destination already exists...');
      const destExists = await fs.pathExists(destPath);
      if (destExists) {
        console.error('[COPY] Destination already exists:', destPath);
        throw new Error(`Le dossier de destination existe déjà: ${destPath}`);
      }
      console.log('[COPY] Destination is available ✓');

      // Ensure parent directory exists
      const parentDir = path.dirname(destPath);
      console.log('[COPY] Ensuring parent directory exists:', parentDir);
      await fs.ensureDir(parentDir);
      console.log('[COPY] Parent directory ready ✓');

      // Copy the entire directory
      console.log('[COPY] Copying files... (this may take a moment)');
      await fs.copy(sourcePath, destPath, {
        overwrite: false,
        errorOnExist: true
      });
      console.log('[COPY] Files copied successfully ✓');

      // Verify the copy was successful
      console.log('[COPY] Verifying copy operation...');
      const copiedExists = await fs.pathExists(destPath);
      if (!copiedExists) {
        console.error('[COPY] Verification failed - destination does not exist after copy');
        throw new Error('La copie a échoué - le dossier de destination n\'existe pas');
      }
      console.log('[COPY] Verification successful ✓');

      console.log('[COPY] WordPress copy operation completed successfully!');
      return { success: true, path: destPath };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      console.error('[COPY] Copy operation failed:', errorMessage);
      throw new Error(`Erreur lors de la copie: ${errorMessage}`);
    }
  }

  /**
   * Check if a path is accessible
   * @param targetPath - Path to check
   */
  async checkPathAccessible(targetPath: string): Promise<boolean> {
    console.log('[COPY] Checking path accessibility:', targetPath);
    try {
      await fs.access(targetPath, fs.constants.W_OK);
      console.log('[COPY] Path is accessible ✓');
      return true;
    } catch (error) {
      console.error('[COPY] Path is not accessible:', targetPath);
      return false;
    }
  }
}

export default new CopyService();
