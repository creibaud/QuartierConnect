# Empty dataset

This test dataset wipes the three databases, leaving no data at all. It
deliberately contains no import file: the application recreates everything it
needs by itself.

## Why no file is needed

| Database | Schema creation |
|----------|-----------------|
| PostgreSQL | Migrations are applied automatically when the API starts (`api/drizzle/` folder). The import script drops the schema (`DROP SCHEMA public CASCADE`): the API must be restarted to recreate it. |
| MongoDB | Collections (and the `pdfs`, `avatars`, `messaging_files` GridFS buckets) are created on the fly by the API on first write. Indexes are recreated when the API starts. |
| Neo4j | The database defines no application constraint or index (checked with `SHOW CONSTRAINTS`), so there is nothing to replay. Nodes and relationships are created by the API as the app is used. |

## Usage

From the repository root, with the Docker stack running:

```bash
./deliverables/test-datasets/import-dataset.sh empty-dataset
```

The script purges the three databases (`DROP SCHEMA`, `deleteMany`,
`DETACH DELETE`) and stops there. Restart the API afterwards so it replays its
migrations: you get a blank application — create the first account from the
sign-up screen.
