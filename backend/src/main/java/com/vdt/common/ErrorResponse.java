package com.vdt.common;

public record ErrorResponse(String error, String message) {
    // Java record — immutable, with auto-generated constructor, getters, equals, hashCode
    // Jackson serializes to: { "error": "...", "message": "..." }
}
