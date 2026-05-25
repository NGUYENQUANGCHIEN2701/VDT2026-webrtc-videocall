package com.vdt;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@ActiveProfiles("test")
class FlywayMigrationTest {

    @Autowired
    JdbcTemplate jdbcTemplate;

    @Test
    void testSchemaCreated() {
        // H2 in PostgreSQL MODE: filter by table_schema to avoid duplicates across schemas
        Integer count = jdbcTemplate.queryForObject(
            "SELECT COUNT(*) FROM information_schema.tables WHERE LOWER(table_name) = 'users' AND LOWER(table_schema) = 'public'",
            Integer.class);
        assertThat(count).isEqualTo(1);
    }

    @Test
    void testUsersTableHasExpectedColumns() {
        // Query column names from information_schema, case-insensitively
        List<String> columns = jdbcTemplate.queryForList(
            "SELECT LOWER(column_name) FROM information_schema.columns WHERE LOWER(table_name) = 'users'",
            String.class);
        assertThat(columns).contains("id", "username", "password_hash", "display_name", "status", "created_at");
    }

    @Test
    void testUsernameUniqueIndexExists() {
        // Verify the unique index on username exists
        Integer count = jdbcTemplate.queryForObject(
            "SELECT COUNT(*) FROM information_schema.indexes WHERE LOWER(index_name) LIKE '%username%'",
            Integer.class);
        assertThat(count).isGreaterThan(0);
    }
}
