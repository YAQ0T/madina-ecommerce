import SwiftUI

struct ProductsListContainerView: View {
    @EnvironmentObject private var appState: AppState
    @StateObject private var viewModel: ProductListViewModel
    @State private var searchText: String = ""

    init(viewModel: ProductListViewModel) {
        _viewModel = StateObject(wrappedValue: viewModel)
    }

    var body: some View {
        NavigationStack {
            List {
                Section {
                    ForEach(viewModel.products) { product in
                        NavigationLink(destination: ProductDetailView(viewModel: ProductDetailViewModel(productID: product.id, productService: appState.productService))) {
                            ProductRow(product: product, language: appState.language)
                        }
                    }

                    if viewModel.isLoading {
                        HStack { Spacer(); ProgressView(); Spacer() }
                    } else if viewModel.hasMore {
                        HStack { Spacer(); loadMoreButton; Spacer() }
                            .listRowSeparator(.hidden)
                    }
                }
            }
            .listStyle(.insetGrouped)
            .navigationTitle("المنتجات")
            .searchable(text: $searchText, placement: .navigationBarDrawer(displayMode: .always))
            .onChange(of: searchText) { newValue in
                Task { await performSearch(with: newValue) }
            }
            .task { await viewModel.loadNextPage(reset: viewModel.products.isEmpty) }
            .refreshable { await viewModel.reset(with: appState.productQuery) }
            .onChange(of: appState.productQuery) { newQuery in
                Task { await viewModel.reset(with: newQuery) }
            }
        }
    }

    private var loadMoreButton: some View {
        Button("المزيد") {
            Task { await viewModel.loadNextPage() }
        }
    }

    private func performSearch(with text: String) async {
        var query = appState.productQuery
        query.search = text
        appState.productQuery = query
        await viewModel.reset(with: query)
    }
}

struct ProductRow: View {
    let product: Product
    let language: AppLanguage

    var body: some View {
        HStack(spacing: 16) {
            AsyncImageView(url: product.images.first.flatMap(URL.init(string:)))
                .frame(width: 88, height: 88)
                .clipShape(RoundedRectangle(cornerRadius: 16))
            VStack(alignment: .trailing, spacing: 8) {
                Text(product.name.value(for: language) ?? "بدون اسم")
                    .font(.headline)
                if let price = product.minPrice {
                    Text("\(price, format: .number.precision(.fractionLength(2))) ₪")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                }
            }
            Spacer()
        }
        .frame(maxWidth: .infinity, alignment: .trailing)
    }
}
