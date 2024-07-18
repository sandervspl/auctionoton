import postgres from 'postgres';

// Configure your PostgreSQL connection
const sql = postgres(process.env.DB_URL!);

async function cleanupDatabase() {
  try {
    // Delete old records
    const deleteResult = await sql`
      DELETE FROM items
      WHERE timestamp < CURRENT_DATE - INTERVAL '30 days'
    `;
    console.log(`Deleted ${deleteResult.count} rows`);

    // VACUUM FULL ANALYZE
    console.log('Starting VACUUM FULL ANALYZE...');
    await sql.unsafe('VACUUM FULL ANALYZE items');
    console.log('VACUUM FULL ANALYZE completed');

    // REINDEX
    console.log('Starting REINDEX...');
    await sql.unsafe('REINDEX TABLE items');
    console.log('REINDEX completed');

    console.log('Database cleanup completed successfully');
  } catch (err) {
    console.error('Error during database cleanup:', err);
  } finally {
    await sql.end();
  }
}

// Run the cleanup function
cleanupDatabase();
