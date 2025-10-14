import Foundation

struct APIConfiguration {
    let baseURL: URL

    init(bundle: Bundle = .main) {
        if let baseString = bundle.object(forInfoDictionaryKey: "API_BASE_URL") as? String,
           let url = URL(string: baseString) {
            self.baseURL = url
        } else if let env = ProcessInfo.processInfo.environment["API_BASE_URL"],
                  let url = URL(string: env) {
            self.baseURL = url
        } else {
            self.baseURL = URL(string: "http://localhost:3000")!
        }
    }
}
