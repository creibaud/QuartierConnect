/** Resize an image file to a square JPEG Blob, suitable for an avatar upload. */
export function resizeImageToBlob(file: File, size = 256): Promise<Blob> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = () => reject(new Error("Could not read file"));
        reader.onload = () => {
            const img = new Image();
            img.onerror = () => reject(new Error("Could not load image"));
            img.onload = () => {
                const canvas = document.createElement("canvas");
                canvas.width = size;
                canvas.height = size;
                const ctx = canvas.getContext("2d");
                if (!ctx) {
                    reject(new Error("Canvas not supported"));
                    return;
                }
                const min = Math.min(img.width, img.height);
                const sx = (img.width - min) / 2;
                const sy = (img.height - min) / 2;
                ctx.drawImage(img, sx, sy, min, min, 0, 0, size, size);
                canvas.toBlob(
                    (blob) =>
                        blob
                            ? resolve(blob)
                            : reject(new Error("Could not encode image")),
                    "image/jpeg",
                    0.85,
                );
            };
            img.src = reader.result as string;
        };
        reader.readAsDataURL(file);
    });
}
