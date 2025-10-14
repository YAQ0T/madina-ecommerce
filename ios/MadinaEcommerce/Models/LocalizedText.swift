import Foundation

struct LocalizedText: Codable, Hashable {
    let ar: String?
    let he: String?
    let en: String?

    init(ar: String? = nil, he: String? = nil, en: String? = nil) {
        self.ar = ar
        self.he = he
        self.en = en
    }

    func value(for language: AppLanguage) -> String? {
        switch language {
        case .arabic: return ar ?? he ?? en
        case .hebrew: return he ?? ar ?? en
        case .english: return en ?? ar ?? he
        }
    }
}

extension LocalizedText {
    init(from decoder: Decoder) throws {
        let container = try decoder.singleValueContainer()
        if let dict = try? container.decode([String: String].self) {
            self.init(ar: dict["ar"], he: dict["he"], en: dict["en"])
        } else if let string = try? container.decode(String.self) {
            self.init(ar: string, he: string, en: string)
        } else {
            self.init()
        }
    }

    func encode(to encoder: Encoder) throws {
        var container = encoder.singleValueContainer()
        var dict: [String: String] = [:]
        dict["ar"] = ar
        dict["he"] = he
        dict["en"] = en
        let filtered = dict.compactMapValues { $0 }
        try container.encode(filtered)
    }
}
