const crypto = require('crypto');
const readline = require('readline/promises');

const SCRYPT_KEY_LENGTH = 64;

async function main() {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
    try {
        const senha = await rl.question('Digite a nova senha admin: ');
        if (!senha || senha.length < 12) {
            throw new Error('Use uma senha com pelo menos 12 caracteres.');
        }
        const salt = crypto.randomBytes(24).toString('base64url');
        const hash = crypto.scryptSync(senha, salt, SCRYPT_KEY_LENGTH).toString('base64url');
        console.log(`ADMIN_PASSWORD_HASH=scrypt$${salt}$${hash}`);
        console.log(`ADMIN_SESSION_SECRET=${crypto.randomBytes(32).toString('base64url')}`);
    } finally {
        rl.close();
    }
}

main().catch((error) => {
    console.error(error.message);
    process.exit(1);
});
