/**
 * Promotes a user to ADMIN.
 *
 * Deliberately a CLI script and not an endpoint: the first admin has to come
 * from somewhere, and that somewhere should be a shell on the server, not a
 * form on the internet.
 *
 *   npm run make:admin you@example.com
 */
import { prisma } from "../src/lib/prisma";

const [, , email, roleArg] = process.argv;
const role = roleArg === "RENTER" ? "RENTER" : "ADMIN";

async function main() {
    if (!email) {
        console.error("usage: npm run make:admin <email> [ADMIN|RENTER]");
        process.exit(1);
    }

    const user = await prisma.user.update({
        where: { email },
        data: { role },
        select: { email: true, name: true, role: true },
    });

    console.log(`${user.name} <${user.email}> is now ${user.role}`);
    process.exit(0);
}

main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
});
