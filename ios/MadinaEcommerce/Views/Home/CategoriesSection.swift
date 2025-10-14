import SwiftUI

struct CategoryItem: Identifiable, Hashable {
    let id = UUID()
    let key: String
    let title: LocalizedText
    let imageURL: URL?
}

struct CategoriesSection: View {
    let language: AppLanguage
    let onSelect: (String?, String?) -> Void

    private var categories: [CategoryItem] {
        [
            CategoryItem(key: "wood", title: LocalizedText(ar: "أخشاب", he: "עץ"), imageURL: URL(string: "https://placehold.co/200x200?text=Wood")),
            CategoryItem(key: "fabric", title: LocalizedText(ar: "أقمشة", he: "בדים"), imageURL: URL(string: "https://placehold.co/200x200?text=Fabric")),
            CategoryItem(key: "foam", title: LocalizedText(ar: "اسفنج", he: "קצף"), imageURL: URL(string: "https://placehold.co/200x200?text=Foam")),
            CategoryItem(key: "tools", title: LocalizedText(ar: "معدات", he: "כלים"), imageURL: URL(string: "https://placehold.co/200x200?text=Tools"))
        ]
    }

    var body: some View {
        VStack(alignment: .trailing, spacing: 16) {
            Text("الأقسام الرئيسية")
                .font(.title2.bold())
            LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: 16), count: 2), spacing: 16) {
                ForEach(categories) { category in
                    Button {
                        onSelect(category.key, nil)
                    } label: {
                        VStack(spacing: 12) {
                            AsyncImageView(url: category.imageURL)
                                .frame(height: 120)
                                .clipShape(RoundedRectangle(cornerRadius: 16))
                            Text(category.title.value(for: language) ?? category.key)
                                .font(.headline)
                        }
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(.thinMaterial, in: RoundedRectangle(cornerRadius: 20))
                    }
                    .buttonStyle(.plain)
                }
            }
        }
    }

}
