import * as fs from 'fs';
export function readFile(fd: number, offset: number, length: number, position: fs.ReadPosition | null): Promise<Buffer> {
	return new Promise((resolve, reject) => {
		const buffer = Buffer.allocUnsafe(length);
		fs.read(fd, buffer, offset, buffer.length, position, (err) => {
			if (err) {
				reject(err);
			} else {
				resolve(buffer);
			}
		});
	});
}
