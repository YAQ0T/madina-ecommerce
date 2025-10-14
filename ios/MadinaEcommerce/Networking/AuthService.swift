import Foundation

struct LoginPayload: Codable {
    let phoneNumber: String
    let password: String
}

struct AuthResponse: Codable {
    let token: String
    let user: UserProfile
}

struct UserProfile: Codable {
    let name: String?
    let phoneNumber: String?
}

final class AuthService {
    private let client: APIClient

    init(client: APIClient) {
        self.client = client
    }

    func login(phoneNumber: String, password: String) async throws -> AuthState {
        let payload = LoginPayload(phoneNumber: phoneNumber, password: password)
        let data = try JSONEncoder().encode(payload)
        var request = APIRequest(path: "/api/auth/login", method: .post)
        request.body = data
        let response = try await client.send(request, as: AuthResponse.self)
        return AuthState(token: response.token,
                         phoneNumber: response.user.phoneNumber,
                         name: response.user.name)
    }
}
