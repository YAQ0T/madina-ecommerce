# Madina Ecommerce iOS Client

This directory contains a SwiftUI implementation of the Al-Madina Al-Munawwara storefront.
The app consumes the existing production API that already powers the web experience, so no
new backend or database setup is required.

## Getting started

1. In Xcode 15 or newer create a new **App** project named `MadinaEcommerce` targeting iOS 17.
2. When Xcode asks for a location, point it at `ios/MadinaEcommerce` so the generated project lives next to the provided source files.
3. Add the Swift files from `Models/`, `Networking/`, `ViewModels/`, and `Views/` to the project (File → Add Files to "MadinaEcommerce"...).
4. Add a `Config.xcconfig` file (see `Resources/Config.example.xcconfig`) and assign it to the project/targets so the `API_BASE_URL` build setting is available at runtime.
5. Build and run the `MadinaEcommerce` target on an iOS 17 simulator or device.

The project uses Swift 5.9 and requires iOS 17.0 or newer because it relies on the latest
`Observable` and `@Environment` APIs.

## Architecture overview

The client follows a simple MVVM structure:

- `Models/` contains the decodable DTOs that mirror the REST responses returned by the
  existing Node/Express API.
- `Networking/` implements a small type-safe layer on top of `URLSession` along with
  request builders for the most common API calls (home collections, product search, product
  details, and authentication).
- `ViewModels/` expose observable state used by SwiftUI views. They orchestrate fetching,
  pagination, optimistic UI updates, and cart persistence.
- `Views/` mirror the layout of the website, including the hero section, category grid,
  benefits cards, product list, product details, and cart workflows.
- `Resources/` stores static assets and sample configuration files.

The Swift code intentionally shares naming conventions with the web client so that future
features can be ported between the codebases quickly.

## Reusing the existing backend

Set the `API_BASE_URL` build setting to point at the current Express server (for example,
`https://madina.example.com`). All requests reuse the same authentication cookies and JWT
logic that the website uses:

- For read-only endpoints the app uses anonymous requests.
- When a user signs in, the received token is stored securely using the keychain and attached
  as a `Bearer` header on subsequent calls.

No additional backend changes are necessary. The app shares product listings, cart rules,
checkout, and policy content with the existing deployment.

## Localization

The app ships with the same Arabic/Hebrew localization primitives defined on the website.
Localized strings from the API are exposed via the `LocalizedText` model while UI copy lives
in `Resources/Localization`. The user can switch languages from the Account tab, mirroring the
web experience.

## Unit tests

`MadinaEcommerceTests` covers the parsing logic for localized content, networking response
handling, and cart math. Add new tests under `ios/MadinaEcommerce/Tests` as functionality grows.

