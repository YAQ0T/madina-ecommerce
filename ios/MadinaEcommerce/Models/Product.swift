import Foundation

struct Product: Identifiable, Codable, Hashable {
    let id: String
    let slug: String?
    let name: LocalizedText
    let description: LocalizedText?
    let images: [String]
    let minPrice: Double?
    let maxPrice: Double?
    let mainCategory: String?
    let subCategory: String?
    let ownershipType: String?
    let priority: String?
    let variants: [Variant]?

    enum CodingKeys: String, CodingKey {
        case id = "_id"
        case legacyID = "id"
        case slug
        case name
        case description
        case images
        case minPrice
        case maxPrice
        case mainCategory
        case subCategory
        case ownershipType
        case priority
        case variants = "vars"
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        if let id = try container.decodeIfPresent(String.self, forKey: .id) {
            self.id = id
        } else if let legacy = try container.decodeIfPresent(String.self, forKey: .legacyID) {
            self.id = legacy
        } else if let slug = try container.decodeIfPresent(String.self, forKey: .slug) {
            self.id = slug
        } else {
            throw DecodingError.dataCorruptedError(forKey: .id,
                                                   in: container,
                                                   debugDescription: "Product is missing an identifier")
        }

        self.slug = try container.decodeIfPresent(String.self, forKey: .slug)
        self.name = try container.decodeIfPresent(LocalizedText.self, forKey: .name) ?? LocalizedText()
        self.description = try container.decodeIfPresent(LocalizedText.self, forKey: .description)
        self.images = try container.decodeIfPresent([String].self, forKey: .images) ?? []
        self.minPrice = try container.decodeIfPresent(Double.self, forKey: .minPrice)
        self.maxPrice = try container.decodeIfPresent(Double.self, forKey: .maxPrice)
        self.mainCategory = try container.decodeIfPresent(String.self, forKey: .mainCategory)
        self.subCategory = try container.decodeIfPresent(String.self, forKey: .subCategory)
        self.ownershipType = try container.decodeIfPresent(String.self, forKey: .ownershipType)
        self.priority = try container.decodeIfPresent(String.self, forKey: .priority)
        self.variants = try container.decodeIfPresent([Variant].self, forKey: .variants)
    }

    init(id: String,
         slug: String? = nil,
         name: LocalizedText,
         description: LocalizedText? = nil,
         images: [String] = [],
         minPrice: Double? = nil,
         maxPrice: Double? = nil,
         mainCategory: String? = nil,
         subCategory: String? = nil,
         ownershipType: String? = nil,
         priority: String? = nil,
         variants: [Variant]? = nil) {
        self.id = id
        self.slug = slug
        self.name = name
        self.description = description
        self.images = images
        self.minPrice = minPrice
        self.maxPrice = maxPrice
        self.mainCategory = mainCategory
        self.subCategory = subCategory
        self.ownershipType = ownershipType
        self.priority = priority
        self.variants = variants
    }
}

struct ProductListResponse: Codable {
    let data: [Product]
    let total: Int
    let page: Int
    let limit: Int
}

struct HomeCollectionResponse: Codable {
    let title: LocalizedText?
    let products: [Product]
}
