import SwiftUI

struct ProductDetailView: View {
    @EnvironmentObject private var appState: AppState
    @StateObject private var viewModel: ProductDetailViewModel

    init(viewModel: ProductDetailViewModel) {
        _viewModel = StateObject(wrappedValue: viewModel)
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .trailing, spacing: 16) {
                if let product = viewModel.product {
                    ProductGallery(images: product.images)
                    Text(product.name.value(for: appState.language) ?? "بدون اسم")
                        .font(.title.bold())
                        .frame(maxWidth: .infinity, alignment: .trailing)

                    if let description = product.description?.value(for: appState.language) {
                        Text(description)
                            .frame(maxWidth: .infinity, alignment: .trailing)
                    }

                    VariantPicker(product: product,
                                  selected: $viewModel.selectedVariant)

                    Button {
                        guard let product = viewModel.product else { return }
                        appState.cart.add(product: product,
                                          variant: viewModel.selectedVariant)
                    } label: {
                        Text("أضف إلى السلة")
                            .frame(maxWidth: .infinity)
                            .padding()
                            .background(Color.accentColor)
                            .foregroundStyle(.white)
                            .clipShape(RoundedRectangle(cornerRadius: 16))
                    }
                } else if viewModel.isLoading {
                    ProgressView()
                        .frame(maxWidth: .infinity)
                } else if let message = viewModel.errorMessage {
                    Text(message)
                        .foregroundStyle(.red)
                        .frame(maxWidth: .infinity)
                }
            }
            .padding(16)
        }
        .navigationTitle("تفاصيل المنتج")
        .navigationBarTitleDisplayMode(.inline)
        .task { await viewModel.load() }
    }
}

private struct ProductGallery: View {
    let images: [String]

    var body: some View {
        TabView {
            ForEach(images, id: \.self) { url in
                AsyncImageView(url: URL(string: url))
                    .aspectRatio(3 / 4, contentMode: .fit)
                    .clipShape(RoundedRectangle(cornerRadius: 20))
            }
        }
        .frame(height: 320)
        .tabViewStyle(.page)
    }
}

private struct VariantPicker: View {
    let product: Product
    @Binding var selected: Variant?

    var body: some View {
        VStack(alignment: .trailing, spacing: 12) {
            Text("الخيارات المتاحة")
                .font(.headline)
            if let variants = product.variants, !variants.isEmpty {
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack {
                        ForEach(variants) { variant in
                            VariantChip(variant: variant,
                                        isSelected: variant.id == selected?.id)
                                .onTapGesture { selected = variant }
                        }
                    }
                }
            } else {
                Text("لا توجد خيارات إضافية")
                    .foregroundStyle(.secondary)
            }
        }
    }
}

private struct VariantChip: View {
    let variant: Variant
    let isSelected: Bool

    var body: some View {
        VStack(alignment: .trailing, spacing: 8) {
            Text(variant.tags?.joined(separator: " • ") ?? "")
                .font(.subheadline)
            if let price = variant.salePrice ?? variant.price {
                Text("\(price, format: .number.precision(.fractionLength(2))) ₪")
                    .font(.callout)
            }
        }
        .padding(12)
        .background(isSelected ? Color.accentColor.opacity(0.2) : Color.gray.opacity(0.1))
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }
}
