package com.vdt.auth;

import com.vdt.auth.dto.AuthResponse;
import com.vdt.auth.dto.LoginRequest;
import com.vdt.auth.dto.RegisterRequest;
import com.vdt.common.UsernameAlreadyExistsException;
import com.vdt.user.User;
import com.vdt.user.UserRepository;
import com.vdt.user.UserStatus;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final JwtService jwtService;

    public AuthResponse register(RegisterRequest request) {
        if (userRepository.existsByUsername(request.username())) {
            throw new UsernameAlreadyExistsException("Username already taken");
        }
        User user = User.builder()
                .username(request.username())
                .passwordHash(passwordEncoder.encode(request.password()))
                .displayName(request.username())  // D-11: display_name defaults to username
                .status(UserStatus.OFFLINE)
                .build();
        userRepository.save(user);
        String token = jwtService.generateToken(user.getUsername());
        return new AuthResponse(token);
    }

    public AuthResponse login(LoginRequest request) {
        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.username(), request.password())
        );
        // Mark user ONLINE after successful authentication (AUTH-03)
        userRepository.findByUsername(request.username())
                .ifPresent(u -> {
                    u.setStatus(UserStatus.ONLINE);
                    userRepository.save(u);
                });
        String token = jwtService.generateToken(request.username());
        return new AuthResponse(token);
    }

    public void logout(String username) {
        // D-04: client-side logout only — no JWT blacklist; just set status = OFFLINE
        // D-05: no WebSocket events from Phase 1 logout
        userRepository.findByUsername(username)
                .ifPresent(u -> {
                    u.setStatus(UserStatus.OFFLINE);
                    userRepository.save(u);
                });
    }
}
