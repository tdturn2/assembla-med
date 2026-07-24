import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { Injectable } from '@nestjs/common';
import { randomBytes } from 'node:crypto';

@Injectable()
export class StorageService {
  private root() {
    return process.env.STORAGE_ROOT ?? join(process.cwd(), 'storage');
  }

  async saveSignature(organizationId: string, dataUrlOrBase64: string) {
    const base64 = dataUrlOrBase64.includes(',')
      ? dataUrlOrBase64.split(',')[1]
      : dataUrlOrBase64;
    const buffer = Buffer.from(base64, 'base64');
    const key = `signatures/${organizationId}/${Date.now()}-${randomBytes(6).toString('hex')}.png`;
    const fullPath = join(this.root(), key);
    await mkdir(join(fullPath, '..'), { recursive: true });
    await writeFile(fullPath, buffer);
    return key;
  }
}
