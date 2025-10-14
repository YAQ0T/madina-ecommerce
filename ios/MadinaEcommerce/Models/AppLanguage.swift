import Foundation

enum AppLanguage: String, CaseIterable, Codable, Identifiable {
    case arabic = "ar"
    case hebrew = "he"
    case english = "en"

    var id: String { rawValue }

    var displayName: String {
        switch self {
        case .arabic: return "العربية"
        case .hebrew: return "עברית"
        case .english: return "English"
        }
    }
}

struct LanguageStorage {
    private let defaults = UserDefaults.standard
    private let key = "madina.language"

    func load() -> AppLanguage {
        guard let raw = defaults.string(forKey: key), let lang = AppLanguage(rawValue: raw) else {
            return .arabic
        }
        return lang
    }

    func save(_ language: AppLanguage) {
        defaults.set(language.rawValue, forKey: key)
    }
}
