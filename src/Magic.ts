import fs from 'node:fs';
import type {FileHandle} from 'node:fs/promises';

/**
 * Class to check for magic numbers of various filesystems at given offsets.
 * @example
 * const fh = await fsp.open(device, 'rs+');
 * const magic = new Magic(fh);
 * console.log(magic.haveExt(0)); // check for EXT at offset 0
 */
export class Magic {
	#handle: FileHandle;
	public constructor(fileHandle: FileHandle) {
		this.#handle = fileHandle;
	}
	public haveExt(offset: number): boolean {
		const data = Buffer.allocUnsafe(2048);
		fs.readSync(this.#handle.fd, data, 0, data.length, 512 * offset);
		return data.readInt16BE(1080) === 0x53ef;
	}
	public haveNtfs(offset: number): boolean {
		const data = Buffer.allocUnsafe(512);
		fs.readSync(this.#handle.fd, data, 0, data.length, 512 * offset);
		return data.readInt32BE(3) === 0x4e544653;
	}
	public haveLvm2(offset: number): boolean {
		const data = Buffer.allocUnsafe(1024);
		fs.readSync(this.#handle.fd, data, 0, data.length, 512 * offset);
		return data.readInt32BE(536) === 0x4c564d32;
	}
}
