import SwiftUI

struct ProductsCarousel: View {
    @EnvironmentObject private var appState: AppState
    enum PlaceholderType {
        case recommended
        case newArrivals

        var products: [Product] {
            switch self {
            case .recommended:
                return Self.mockProducts(prefix: "P")
            case .newArrivals:
                return Self.mockProducts(prefix: "N")
            }
        }

        private static func mockProducts(prefix: String) -> [Product] {
            (1...6).map { index in
                Product(id: "\(prefix)\(index)",
                        name: LocalizedText(ar: "منتج تجريبي \(index)", he: "מוצר לדוגמה \(index)", en: "Sample Product \(index)"),
                        images: ["https://placehold.co/400x400?text=\(prefix)\(index)"],
                        minPrice: Double(25 * index))
            }
        }
    }

    let title: String
    let products: [Product]
    let language: AppLanguage
    let placeholder: PlaceholderType
    let onBrowseAll: () -> Void

    var body: some View {
        let isPlaceholder = products.isEmpty
        VStack(alignment: .trailing, spacing: 16) {
            HStack {
                Button("تسوق الكل") { onBrowseAll() }
                    .font(.callout)
                Spacer()
                Text(title)
                    .font(.title2.bold())
            }
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 16) {
                    ForEach(displayProducts) { product in
                        Group {
                            if isPlaceholder {
                                ProductCardView(product: product, language: language)
                                    .frame(width: 200)
                            } else {
                                NavigationLink(destination: ProductDetailView(viewModel: ProductDetailViewModel(productID: product.id,
                                                                                                           productService: appState.productService))) {
                                    ProductCardView(product: product, language: language)
                                        .frame(width: 200)
                                }
                            }
                        }
                    }
                }
                .padding(.vertical, 8)
            }
        }
    }

    private var displayProducts: [Product] {
        products.isEmpty ? placeholder.products : products
    }
}

struct ProductCardView: View {
    let product: Product
    let language: AppLanguage

    var body: some View {
        VStack(alignment: .trailing, spacing: 12) {
            AsyncImageView(url: product.images.first.flatMap(URL.init(string:)))
                .aspectRatio(3 / 4, contentMode: .fill)
                .clipShape(RoundedRectangle(cornerRadius: 20))
            Text(product.name.value(for: language) ?? "بدون اسم")
                .font(.headline)
                .lineLimit(1)
            if let price = product.minPrice {
                Text("\(price, format: .number.precision(.fractionLength(2))) ₪")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            }
        }
        .padding()
        .frame(maxWidth: .infinity, alignment: .trailing)
        .background(.thinMaterial, in: RoundedRectangle(cornerRadius: 24))
    }
}
