import Foundation

struct ProductQuery: Equatable {
    var search: String?
    var category: String?
    var subCategory: String?
    var page: Int = 1
    var limit: Int = 20
    var sort: Sort = .new

    enum Sort: String, Equatable {
        case new
        case priceAsc
        case priceDesc
    }
}

final class ProductService {
    private let client: APIClient

    init(client: APIClient) {
        self.client = client
    }

    func fetchHomeCollection(_ slug: String) async throws -> [Product] {
        let request = APIRequest(path: "/api/home-collections/\(slug)")
        let (data, _) = try await client.send(request)
        let decoder = JSONDecoder()
        decoder.keyDecodingStrategy = .convertFromSnakeCase
        if let response = try? decoder.decode(HomeCollectionResponse.self, from: data) {
            return response.products
        }
        if let array = try? decoder.decode([Product].self, from: data) {
            return array
        }
        throw APIError(statusCode: 200, message: "Unexpected response format")
    }

    func fetchProducts(query: ProductQuery) async throws -> ProductListResponse {
        var request = APIRequest(path: "/api/products/with-stats")
        var items: [URLQueryItem] = [
            URLQueryItem(name: "page", value: String(query.page)),
            URLQueryItem(name: "limit", value: String(query.limit)),
            URLQueryItem(name: "sort", value: query.sort.rawValue)
        ]
        if let search = query.search, !search.isEmpty {
            items.append(URLQueryItem(name: "q", value: search))
        }
        if let category = query.category {
            items.append(URLQueryItem(name: "mainCategory", value: category))
        }
        if let sub = query.subCategory {
            items.append(URLQueryItem(name: "subCategory", value: sub))
        }
        request.queryItems = items
        return try await client.send(request, as: ProductListResponse.self)
    }

    func fetchProduct(id: String, includeVariants: Bool = true) async throws -> Product {
        var request = APIRequest(path: "/api/products/\(id)")
        if includeVariants {
            request.queryItems = [URLQueryItem(name: "withVariants", value: "1")]
        }
        return try await client.send(request, as: Product.self)
    }
}
