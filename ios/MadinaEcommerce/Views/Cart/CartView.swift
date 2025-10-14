import SwiftUI

struct CartView: View {
    @EnvironmentObject private var appState: AppState

    var body: some View {
        NavigationStack {
            List {
                Section {
                    ForEach(appState.cart.items) { item in
                        CartRow(item: item, language: appState.language) { quantity in
                            appState.cart.updateQuantity(for: item.id, quantity: quantity)
                        } onDelete: {
                            appState.cart.remove(item.id)
                        }
                    }
                } footer: {
                    VStack(alignment: .trailing, spacing: 12) {
                        Text("المجموع الفرعي: \(appState.cart.subtotal, format: .number.precision(.fractionLength(2))) ₪")
                            .font(.headline)
                        Button {
                            // Checkout placeholder
                        } label: {
                            Text("متابعة للدفع")
                                .frame(maxWidth: .infinity)
                        }
                        .buttonStyle(.borderedProminent)
                    }
                    .padding(.top, 12)
                }
            }
            .navigationTitle("السلة")
            .toolbar {
                if !appState.cart.items.isEmpty {
                    Button("تفريغ السلة") { appState.cart.clear() }
                }
            }
            .overlay {
                if appState.cart.items.isEmpty {
                    ContentUnavailableView("سلة التسوق فارغة",
                                           systemImage: "cart",
                                           description: Text("ابدأ بإضافة المنتجات من الصفحة الرئيسية."))
                }
            }
        }
    }
}

private struct CartRow: View {
    let item: CartItem
    let language: AppLanguage
    let onQuantityChange: (Int) -> Void
    let onDelete: () -> Void

    var body: some View {
        HStack(spacing: 16) {
            AsyncImageView(url: item.imageURL)
                .frame(width: 72, height: 72)
                .clipShape(RoundedRectangle(cornerRadius: 12))
            VStack(alignment: .trailing, spacing: 8) {
                Text(item.name.value(for: language) ?? "")
                    .font(.headline)
                Text("\(item.price, format: .number.precision(.fractionLength(2))) ₪")
                    .foregroundStyle(.secondary)
                Stepper(value: Binding(get: { item.quantity }, set: onQuantityChange), in: 1...20) {
                    Text("الكمية: \(item.quantity)")
                }
            }
            Spacer()
            Button(role: .destructive, action: onDelete) {
                Image(systemName: "trash")
            }
        }
        .frame(maxWidth: .infinity, alignment: .trailing)
    }
}
