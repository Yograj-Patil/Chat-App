import multer from 'multer';

// Store files in memory so we can stream them to Cloudinary
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
    const allowed = [
        'image/', 'video/', 'audio/',
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/zip',
        'application/x-rar-compressed',
        'text/plain',
        'text/csv',
    ];
    const ok = allowed.some((type) => file.mimetype.startsWith(type));
    if (ok) cb(null, true);
    else cb(new Error('File type not allowed'), false);
};

// 500MB max — Cloudinary free tier will enforce its own limits
export const upload = multer({
    storage,
    fileFilter,
    limits: { fileSize: 500 * 1024 * 1024 },
});
