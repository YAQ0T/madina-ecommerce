import Foundation

@MainActor
final class ProductDetailViewModel: ObservableObject {
    @Published private(set) var product: Product?
    @Published var selectedVariant: Variant?
    @Published var isLoading = false
    @Published var errorMessage: String?

    private let productService: ProductService
    private let productID: String

    init(productID: String, productService: ProductService) {
        self.productID = productID
        self.productService = productService
    }

    func load() async {
        isLoading = true
        errorMessage = nil
        do {
            let product = try await productService.fetchProduct(id: productID)
            self.product = product
            selectedVariant = product.variants?.first
        } catch {
            errorMessage = error.localizedDescription
        }
        isLoading = false
    }
}
