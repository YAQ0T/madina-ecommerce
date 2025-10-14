import SwiftUI

struct HomeContainerView: View {
    @EnvironmentObject private var appState: AppState
    @StateObject private var viewModel: HomeViewModel
    private let onCategorySelected: (String?, String?) -> Void

    init(viewModel: HomeViewModel, onCategorySelected: @escaping (String?, String?) -> Void) {
        _viewModel = StateObject(wrappedValue: viewModel)
        self.onCategorySelected = onCategorySelected
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .trailing, spacing: 24) {
                HeroSection(onStartShopping: { onCategorySelected(nil, nil) })
                CategoriesSection(language: appState.language, onSelect: onCategorySelected)
                BenefitsSection(language: appState.language)
                ProductsCarousel(title: "منتجات مقترحة",
                                 products: viewModel.recommended,
                                 language: appState.language,
                                 placeholder: .recommended,
                                 onBrowseAll: { onCategorySelected(nil, nil) })
                ProductsCarousel(title: "وصل حديثاً",
                                 products: viewModel.newArrivals,
                                 language: appState.language,
                                 placeholder: .newArrivals,
                                 onBrowseAll: { onCategorySelected(nil, nil) })
            }
                }
                .padding(.horizontal, 16)
                .padding(.top, 24)
                .frame(maxWidth: .infinity, alignment: .trailing)
            }
            .navigationTitle("الرئيسية")
        }
        .task { await viewModel.load() }
        .refreshable { await viewModel.load() }
        .overlay(alignment: .top) {
            if viewModel.isLoading {
                ProgressView()
                    .padding()
            }
        }
        .alert(isPresented: .constant(viewModel.errorMessage != nil), content: {
            Alert(title: Text("خطأ"), message: Text(viewModel.errorMessage ?? ""), dismissButton: .default(Text("حسناً")) {
                viewModel.errorMessage = nil
            })
        })
    }
}

struct HomeContainerView_Previews: PreviewProvider {
    static var previews: some View {
        HomeContainerView(viewModel: HomeViewModel(productService: ProductService(client: APIClient(configuration: APIConfiguration()))),
                          onCategorySelected: { _, _ in })
            .environmentObject(AppState())
    }
}

private extension HomeContainerView {
    struct HeroSection: View {
        let onStartShopping: () -> Void

        var body: some View {
            VStack(alignment: .trailing, spacing: 12) {
                Text("أل-مدينة المنوّرة")
                    .font(.largeTitle.bold())
                Text("كل ما تحتاجه من مستلزمات النجارة والأثاث في مكان واحد")
                    .font(.callout)
                    .foregroundStyle(.secondary)
                Button(action: onStartShopping) {
                    Text("ابدأ التسوق")
                        .padding(.vertical, 10)
                        .padding(.horizontal, 24)
                        .background(Color.accentColor)
                        .foregroundStyle(.white)
                        .clipShape(Capsule())
                }
                .frame(maxWidth: .infinity, alignment: .trailing)
            }
        }
    }
}
