import Foundation

struct CartItem: Identifiable, Codable, Hashable {
    let id: String
    let productID: String
    let variantID: String?
    var quantity: Int
    let name: LocalizedText
    let price: Double
    let imageURL: URL?

    init(id: String = UUID().uuidString,
         productID: String,
         variantID: String? = nil,
         quantity: Int,
         name: LocalizedText,
         price: Double,
         imageURL: URL?) {
        self.id = id
        self.productID = productID
        self.variantID = variantID
        self.quantity = quantity
        self.name = name
        self.price = price
        self.imageURL = imageURL
    }
}

struct CartStorage {
    private let defaults = UserDefaults.standard
    private let key = "madina.cart"

    func load() -> [CartItem] {
        guard let data = defaults.data(forKey: key) else { return [] }
        return (try? JSONDecoder().decode([CartItem].self, from: data)) ?? []
    }

    func save(_ items: [CartItem]) {
        guard let data = try? JSONEncoder().encode(items) else { return }
        defaults.set(data, forKey: key)
    }
}

@MainActor
final class CartStore: ObservableObject {
    @Published private(set) var items: [CartItem] = [] {
        didSet { storage.save(items) }
    }

    var subtotal: Double {
        items.reduce(0) { $0 + ($1.price * Double($1.quantity)) }
    }

    private let storage: CartStorage

    init(storage: CartStorage) {
        self.storage = storage
    }

    func syncFromStorage() {
        items = storage.load()
    }

    func add(product: Product, variant: Variant?, quantity: Int = 1) {
        let basePrice = variant?.salePrice ?? variant?.price ?? product.minPrice ?? 0
        guard basePrice > 0 else { return }

        if let index = items.firstIndex(where: { $0.productID == product.id && $0.variantID == variant?.id }) {
            items[index].quantity += quantity
            return
        }

        let imageURL = (variant?.images ?? product.images).first.flatMap(URL.init(string:))
        let item = CartItem(productID: product.id,
                            variantID: variant?.id,
                            quantity: quantity,
                            name: product.name,
                            price: basePrice,
                            imageURL: imageURL)
        items.append(item)
    }

    func updateQuantity(for itemID: CartItem.ID, quantity: Int) {
        guard let index = items.firstIndex(where: { $0.id == itemID }) else { return }
        if quantity <= 0 {
            items.remove(at: index)
        } else {
            items[index].quantity = quantity
        }
    }

    func remove(_ itemID: CartItem.ID) {
        items.removeAll { $0.id == itemID }
    }

    func clear() {
        items.removeAll()
    }
}
