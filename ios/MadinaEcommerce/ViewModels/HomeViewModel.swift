import Foundation

@MainActor
final class HomeViewModel: ObservableObject {
    @Published var recommended: [Product] = []
    @Published var newArrivals: [Product] = []
    @Published var isLoading = false
    @Published var errorMessage: String?

    private let productService: ProductService

    init(productService: ProductService) {
        self.productService = productService
    }

    func load() async {
        isLoading = true
        errorMessage = nil
        do {
            async let recommendedTask = productService.fetchHomeCollection("recommended")
            async let newTask = productService.fetchHomeCollection("new")
            let (recommended, newArrivals) = try await (recommendedTask, newTask)
            self.recommended = recommended
            self.newArrivals = newArrivals
        } catch {
            errorMessage = error.localizedDescription
        }
        isLoading = false
    }
}
