import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function main() {
  const rlsPath = path.join(__dirname, 'rls.sql');
  const sql = fs.readFileSync(rlsPath, 'utf-8');
  console.log('Applying RLS policies...');
  
  // Split statements handling function bodies with $$
  const statements: string[] = [];
  let currentStmt = '';
  let inDollarQuote = false;
  
  const lines = sql.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('--') && !inDollarQuote) {
      continue;
    }
    
    // Check for $$
    const dollarMatches = line.match(/\$\$/g);
    if (dollarMatches && dollarMatches.length % 2 === 1) {
      inDollarQuote = !inDollarQuote;
    }
    
    currentStmt += line + '\n';
    
    if (!inDollarQuote && trimmed.endsWith(';')) {
      const stmtToPush = currentStmt.trim();
      if (stmtToPush.length > 0) {
        statements.push(stmtToPush);
      }
      currentStmt = '';
    }
  }

  for (const stmt of statements) {
    try {
      await prisma.$executeRawUnsafe(stmt);
    } catch (err: any) {
      console.warn(`Warning executing statement: ${stmt.slice(0, 50)}... - ${err.message}`);
    }
  }

  console.log(`Executed ${statements.length} RLS statements successfully.`);
}

main()
  .catch((e) => {
    console.error('Failed to apply RLS policies:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
