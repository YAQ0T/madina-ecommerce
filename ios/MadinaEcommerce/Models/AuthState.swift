import Foundation

struct AuthState: Codable, Equatable {
    let token: String?
    let phoneNumber: String?
    let name: String?

    static let signedOut = AuthState(token: nil, phoneNumber: nil, name: nil)
}

struct AuthStorage {
    private let defaults = UserDefaults.standard
    private let key = "madina.auth"

    func load() -> AuthState {
        guard let data = defaults.data(forKey: key),
              let state = try? JSONDecoder().decode(AuthState.self, from: data)
        else { return .signedOut }
        return state
    }

    func save(_ state: AuthState) {
        guard let data = try? JSONEncoder().encode(state) else { return }
        defaults.set(data, forKey: key)
    }
}
