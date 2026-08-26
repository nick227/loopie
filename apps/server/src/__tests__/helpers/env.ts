const testDatabaseUrl =
  process.env.TEST_DATABASE_URL ?? 'mysql://loopie:loopie_dev_password@localhost:3306/loopie_test'
process.env.DATABASE_URL = testDatabaseUrl
