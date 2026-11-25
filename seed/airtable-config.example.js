'use strict';

// Copy this file to seed/airtable-config.js (git-ignored) and fill in the two base ids.
// Base ids are not secret, but they stay out of the public repository anyway.
// The token is never kept in a file: it is read from AIRTABLE_SEED_TOKEN.

module.exports = {
  operationsBaseId: 'appXXXXXXXXXXXXXX', // Electric Wize - Operations (the agent only reads it)
  findingsBaseId: 'appXXXXXXXXXXXXXX', // Electric Wize - Findings (the agent writes its findings here)
};
