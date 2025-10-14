import Foundation

struct Variant: Identifiable, Codable, Hashable {
    let id: String
    let sku: String?
    let price: Double?
    let salePrice: Double?
    let stock: Int?
    let tags: [String]?
    let images: [String]?

    enum CodingKeys: String, CodingKey {
        case id = "_id"
        case sku
        case price
        case salePrice
        case stock
        case tags
        case images
    }
}
