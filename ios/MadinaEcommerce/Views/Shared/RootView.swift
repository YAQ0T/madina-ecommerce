import SwiftUI

struct RootView: View {
    @EnvironmentObject private var appState: AppState
    @State private var selection: Tab = .home

    var body: some View {
        TabView(selection: $selection) {
            HomeContainerView(viewModel: HomeViewModel(productService: appState.productService),
                               onCategorySelected: { category, sub in
                                   appState.applyCategory(main: category, sub: sub)
                                   selection = .products
                               })
                .tabItem {
                    Label("الرئيسية", systemImage: "house.fill")
                }
                .tag(Tab.home)

            ProductsListContainerView(viewModel: ProductListViewModel(productService: appState.productService,
                                                                       query: appState.productQuery))
                .tabItem {
                    Label("المنتجات", systemImage: "square.grid.2x2")
                }
                .tag(Tab.products)

            CartView()
                .tabItem {
                    Label("السلة", systemImage: "cart.fill")
                }
                .badge(appState.cart.items.count)
                .tag(Tab.cart)

            AccountView()
                .tabItem {
                    Label("حسابي", systemImage: "person.crop.circle")
                }
                .tag(Tab.account)
        }
        .environment(
            \._layoutDirection,
            appState.language == .hebrew ? LayoutDirection.leftToRight : LayoutDirection.rightToLeft
        )
    }
}

extension RootView {
    enum Tab: Hashable {
        case home
        case products
        case cart
        case account
    }
}
