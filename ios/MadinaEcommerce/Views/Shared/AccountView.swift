import SwiftUI

struct AccountView: View {
    @EnvironmentObject private var appState: AppState
    @State private var isPresentingLogin = false
    @State private var loginViewModel: LoginViewModel?

    var body: some View {
        NavigationStack {
            Form {
                Section("اللغة") {
                    Picker("اللغة", selection: $appState.language) {
                        ForEach(AppLanguage.allCases) { language in
                            Text(language.displayName).tag(language)
                        }
                    }
                }

                Section("الحساب") {
                    if let name = appState.auth.name {
                        VStack(alignment: .trailing, spacing: 8) {
                            Text(name)
                                .font(.headline)
                            if let phone = appState.auth.phoneNumber {
                                Text(phone).foregroundStyle(.secondary)
                            }
                            Button("تسجيل الخروج") { appState.signOut() }
                                .foregroundStyle(.red)
                        }
                    } else {
                        Button("تسجيل الدخول") {
                            loginViewModel = LoginViewModel(authService: appState.authService) { state in
                                appState.updateAuth(state)
                                isPresentingLogin = false
                            }
                            loginViewModel?.phoneNumber = appState.auth.phoneNumber ?? ""
                            loginViewModel?.password = ""
                            loginViewModel?.errorMessage = nil
                            isPresentingLogin = true
                        }
                    }
                }
            }
            .navigationTitle("حسابي")
            .sheet(isPresented: $isPresentingLogin) {
                if let model = loginViewModel {
                    LoginSheet(viewModel: model, isPresented: $isPresentingLogin)
                }
            }
        }
    }
}

private struct LoginSheet: View {
    @ObservedObject var viewModel: LoginViewModel
    @Binding var isPresented: Bool

    var body: some View {
        NavigationStack {
            Form {
                TextField("رقم الهاتف", text: $viewModel.phoneNumber)
                    .keyboardType(.phonePad)
                    .textContentType(.telephoneNumber)
                SecureField("كلمة المرور", text: $viewModel.password)

                if let message = viewModel.errorMessage {
                    Text(message)
                        .foregroundStyle(.red)
                }
            }
            .navigationTitle("تسجيل الدخول")
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button("دخول") {
                        Task { await viewModel.submit() }
                    }
                    .disabled(viewModel.isSubmitting)
                }
                ToolbarItem(placement: .cancellationAction) {
                    Button("إغلاق") { isPresented = false }
                }
            }
        }
    }
}
