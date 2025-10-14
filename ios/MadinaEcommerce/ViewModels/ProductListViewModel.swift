import Foundation

@MainActor
final class ProductListViewModel: ObservableObject {
    @Published private(set) var products: [Product] = []
    @Published var isLoading = false
    @Published var hasMore = true
    @Published var errorMessage: String?

    private let productService: ProductService
    private var query: ProductQuery

    init(productService: ProductService, query: ProductQuery = ProductQuery()) {
        self.productService = productService
        self.query = query
    }

    func reset(with query: ProductQuery) async {
        self.query = query
        products = []
        hasMore = true
        await loadNextPage(reset: true)
    }

    func loadNextPage(reset: Bool = false) async {
        guard !isLoading, hasMore else { return }
        isLoading = true
        errorMessage = nil
        do {
            if reset { query.page = 1 }
            let response = try await productService.fetchProducts(query: query)
            if reset {
                products = response.data
            } else {
                products += response.data
            }
            hasMore = products.count < response.total
            query.page += 1
        } catch {
            errorMessage = error.localizedDescription
        }
        isLoading = false
    }
}
