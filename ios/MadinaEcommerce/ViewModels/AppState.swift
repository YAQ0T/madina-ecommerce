import Foundation
import Combine

@MainActor
final class AppState: ObservableObject {
    @Published var language: AppLanguage = .arabic {
        didSet { languageStorage.save(language) }
    }

    @Published var cart: CartStore
    @Published var auth: AuthState
    @Published var productQuery: ProductQuery

    private let languageStorage = LanguageStorage()
    private let cartStorage = CartStorage()
    private let authStorage = AuthStorage()

    let apiClient: APIClient
    let productService: ProductService
    let authService: AuthService

    init() {
        self.language = languageStorage.load()
        self.cart = CartStore(storage: cartStorage)
        self.auth = authStorage.load()
        self.productQuery = ProductQuery()

        let config = APIConfiguration()
        self.apiClient = APIClient(configuration: config)
        self.productService = ProductService(client: apiClient)
        self.authService = AuthService(client: apiClient)

        cart.syncFromStorage()
        apiClient.updateAuthToken(auth.token)
    }

    func updateAuth(_ newState: AuthState) {
        auth = newState
        authStorage.save(newState)
        apiClient.updateAuthToken(newState.token)
    }

    func signOut() {
        updateAuth(.signedOut)
        cart.clear()
    }

    func applyCategory(main: String?, sub: String? = nil) {
        productQuery.category = main
        productQuery.subCategory = sub
        productQuery.search = nil
        productQuery.page = 1
    }
}
