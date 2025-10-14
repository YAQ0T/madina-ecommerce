import Foundation

struct APIError: LocalizedError {
    let statusCode: Int
    let message: String

    var errorDescription: String? { message }
}

final class APIClient {
    private let configuration: APIConfiguration
    private var authToken: String?
    private let session: URLSession

    init(configuration: APIConfiguration, session: URLSession = .shared) {
        self.configuration = configuration
        self.session = session
    }

    func updateAuthToken(_ token: String?) {
        self.authToken = token
    }

    func send<T: Decodable>(_ request: APIRequest, as type: T.Type) async throws -> T {
        let (data, _) = try await send(request)
        let decoder = JSONDecoder()
        decoder.keyDecodingStrategy = .convertFromSnakeCase
        return try decoder.decode(T.self, from: data)
    }

    func send(_ request: APIRequest) async throws -> (Data, HTTPURLResponse) {
        var urlRequest = request.urlRequest(baseURL: configuration.baseURL)
        if let token = authToken {
            urlRequest.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }

        let (data, response) = try await session.data(for: urlRequest)
        guard let httpResponse = response as? HTTPURLResponse else {
            throw URLError(.badServerResponse)
        }
        guard (200..<300).contains(httpResponse.statusCode) else {
            let message = String(data: data, encoding: .utf8) ?? "Unknown error"
            throw APIError(statusCode: httpResponse.statusCode, message: message)
        }
        return (data, httpResponse)
    }
}

struct APIRequest {
    enum Method: String {
        case get = "GET"
        case post = "POST"
        case put = "PUT"
        case delete = "DELETE"
    }

    var path: String
    var method: Method = .get
    var queryItems: [URLQueryItem] = []
    var body: Data?
    var headers: [String: String] = [:]

    func urlRequest(baseURL: URL) -> URLRequest {
        let resolvedURL: URL
        if let custom = URL(string: path), custom.scheme != nil {
            resolvedURL = custom
        } else {
            var base = baseURL
            if path.hasPrefix("/") {
                base = base.appendingPathComponent(String(path.dropFirst()))
            } else {
                base = base.appendingPathComponent(path)
            }
            resolvedURL = base
        }

        var components = URLComponents(url: resolvedURL, resolvingAgainstBaseURL: false) ?? URLComponents()
        components.queryItems = queryItems.isEmpty ? nil : queryItems
        var request = URLRequest(url: components.url ?? resolvedURL)
        request.httpMethod = method.rawValue
        request.httpBody = body
        headers.forEach { request.setValue($1, forHTTPHeaderField: $0) }
        if body != nil { request.setValue("application/json", forHTTPHeaderField: "Content-Type") }
        return request
    }
}
