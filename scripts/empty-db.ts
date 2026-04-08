import { execSync } from 'child_process';

const MONGO_CONTAINER = process.env.MONGO_CONTAINER ?? 'docker-mongodb-1';
const MONGO_DB = process.env.MONGO_DB ?? 'quartierconnect';
const PG_CONTAINER = process.env.PG_CONTAINER ?? 'docker-postgres-1';
const PG_USER = process.env.POSTGRES_USER ?? 'qc';
const PG_DB = process.env.POSTGRES_DB ?? 'quartierconnect';
const NEO4J_CONTAINER = process.env.NEO4J_CONTAINER ?? 'docker-neo4j-1';

function runSilent(cmd: string): void {
  execSync(cmd, { stdio: 'pipe' });
}

function emptyMongo(): void {
  const collections = [
    'users',
    'ssoTokens',
    'neighborhoods',
    'services',
    'contracts',
    'documents',
    'events',
    'messages',
    'conversations',
    'votes',
    'incidents',
  ];

  for (const col of collections) {
    runSilent(
      `docker exec ${MONGO_CONTAINER} mongosh ${MONGO_DB} --quiet --eval "db.${col}.deleteMany({})"`,
    );
  }

  runSilent(
    `docker exec ${MONGO_CONTAINER} mongosh ${MONGO_DB} --quiet --eval "db.runCommand({listBuckets: 1}).buckets?.forEach(b => { db[b.name + '.files'].deleteMany({}); db[b.name + '.chunks'].deleteMany({}); })"`,
  );

  console.log('  ✓ MongoDB vidée');
}

function emptyPostgres(): void {
  const tables = [
    'point_transactions',
    'point_balances',
    'sync_queue',
    'incidents',
    'users',
  ];

  for (const table of tables) {
    runSilent(
      `docker exec ${PG_CONTAINER} psql -U ${PG_USER} -d ${PG_DB} -c "TRUNCATE TABLE ${table} CASCADE" -q`,
    );
  }

  console.log('  ✓ PostgreSQL vidée');
}

function emptyNeo4j(): void {
  runSilent(
    `docker exec ${NEO4J_CONTAINER} cypher-shell -u neo4j -p password "MATCH (n) DETACH DELETE n"`,
  );

  console.log('  ✓ Neo4j vidée');
}

function main(): void {
  console.log('QuartierConnect — Empty DB');
  console.log('Suppression de toutes les données (schémas conservés)\n');

  emptyMongo();
  emptyPostgres();
  emptyNeo4j();

  console.log('\nBase de données vide — prête pour importation jury.');
}

main();
