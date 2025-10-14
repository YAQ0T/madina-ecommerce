import Foundation

@MainActor
final class LoginViewModel: ObservableObject {
    @Published var phoneNumber: String = ""
    @Published var password: String = ""
    @Published var isSubmitting = false
    @Published var errorMessage: String?

    private let authService: AuthService
    var onSuccess: (AuthState) -> Void

    init(authService: AuthService, onSuccess: @escaping (AuthState) -> Void) {
        self.authService = authService
        self.onSuccess = onSuccess
    }

    func submit() async {
        guard !phoneNumber.isEmpty, !password.isEmpty else {
            errorMessage = "يرجى إدخال رقم الهاتف وكلمة المرور"
            return
        }

        isSubmitting = true
        errorMessage = nil
        do {
            let state = try await authService.login(phoneNumber: phoneNumber, password: password)
            onSuccess(state)
        } catch {
            errorMessage = error.localizedDescription
        }
        isSubmitting = false
    }
}
