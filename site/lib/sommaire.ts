export type Track = "swiftui-only" | "dual" | undefined;

export type Fiche = {
  num: string;
  slug: string;
  title: string;
  file: string;
  // "swiftui-only" : pas d'équivalent UIKit (machinerie SwiftUI).
  // "dual" : la fiche contient aussi un rappel de la version UIKit.
  // undefined : transversal (indépendant de SwiftUI/UIKit).
  track?: Track;
};

export type Partie = {
  num: string;
  title: string;
  fiches: Fiche[];
};

export const sommaire: Partie[] = [
  {
    num: "00",
    title: "Fondations Swift (pour le dev UIKit)",
    fiches: [
      { num: "00.00", slug: "00-00", title: "Mon parcours UIKit → SwiftUI", file: "fiche_00_00_parcours_uikit_vers_swiftui.md" },
      { num: "00.01", slug: "00-01", title: "Struct vs class : value types et reference types", file: "fiche_00_01_value_vs_reference_struct_class.md" },
      { num: "00.02", slug: "00-02", title: "Les optionals en profondeur", file: "fiche_00_02_optionals_en_profondeur.md" },
      { num: "00.03", slug: "00-03", title: "Enum, valeurs associées et pattern matching", file: "fiche_00_03_enum_associated_values_pattern_matching.md" },
      { num: "00.04", slug: "00-04", title: "Protocols et protocol-oriented programming", file: "fiche_00_04_protocols_protocol_oriented.md" },
      { num: "00.05", slug: "00-05", title: "Generics, some et any (opaque vs existential)", file: "fiche_00_05_generics_some_any.md" },
      { num: "00.06", slug: "00-06", title: "Codable en conditions réelles", file: "fiche_00_06_codable_reel.md" },
      { num: "00.07", slug: "00-07", title: "Gestion des erreurs : Error, Result, throws", file: "fiche_00_07_erreurs_result_throws.md" },
      { num: "00.08", slug: "00-08", title: "De UIKit à SwiftUI : le pont mental", file: "fiche_00_08_de_uikit_a_swiftui.md" },
      { num: "00.09", slug: "00-09", title: "Mémo express : syntaxe, variables et types", file: "fiche_00_09_memo_syntaxe_types.md" },
      { num: "00.10", slug: "00-10", title: "Mémo express : conditions, boucles et optionals", file: "fiche_00_10_memo_controlflow.md" },
      { num: "00.11", slug: "00-11", title: "Mémo express : fonctions et closures", file: "fiche_00_11_memo_fonctions_closures.md" },
      { num: "00.12", slug: "00-12", title: "Mémo express : collections et leurs méthodes", file: "fiche_00_12_memo_collections.md" },
    ],
  },
  {
    num: "01",
    title: "Fondations SwiftUI",
    fiches: [
      { num: "01.01", slug: "01-01", title: "Structure d'une app SwiftUI", file: "fiche_01_01_structure_dune_app_swift_ui.md", track: "dual" },
      { num: "01.02", slug: "01-02", title: "Comprendre une View SwiftUI", file: "fiche_01_02_comprendre_une_view_swift_ui.md", track: "dual" },
      { num: "01.03", slug: "01-03", title: "Text, Image, Button et modifiers", file: "fiche_01_03_text_image_button_et_modifiers.md", track: "dual" },
      { num: "01.04", slug: "01-04", title: "Layout de base : VStack, HStack, ZStack, Spacer, padding et frame", file: "fiche_01_04_layout_de_base_swift_ui.md", track: "dual" },
      { num: "01.05", slug: "01-05", title: "ScrollView, List et LazyVStack", file: "fiche_01_05_scroll_view_list_lazy_vstack.md", track: "dual" },
      { num: "01.06", slug: "01-06", title: "Les modifiers SwiftUI en profondeur", file: "fiche_01_06_modifiers_swift_ui_en_profondeur.md", track: "swiftui-only" },
      { num: "01.07", slug: "01-07", title: "Les previews SwiftUI", file: "fiche_01_07_previews_swift_ui.md", track: "swiftui-only" },
      { num: "01.08", slug: "01-08", title: "Identité, durée de vie et effets de bord", file: "fiche_01_08_identite_cycle_de_vie.md", track: "dual" },
    ],
  },
  {
    num: "02",
    title: "Gestion d'état SwiftUI",
    fiches: [
      { num: "02.01", slug: "02-01", title: "Comprendre l'état en SwiftUI", file: "fiche_02_01_comprendre_letat_en_swift_ui.md", track: "dual" },
      { num: "02.02", slug: "02-02", title: "@State", file: "fiche_02_02_state_en_swift_ui.md", track: "swiftui-only" },
      { num: "02.03", slug: "02-03", title: "@Binding", file: "fiche_02_03_binding_en_swift_ui.md", track: "swiftui-only" },
      { num: "02.04", slug: "02-04", title: "@StateObject", file: "fiche_02_04_state_object_en_swift_ui.md", track: "swiftui-only" },
      { num: "02.05", slug: "02-05", title: "@ObservedObject", file: "fiche_02_05_observed_object_en_swift_ui.md", track: "swiftui-only" },
      { num: "02.06", slug: "02-06", title: "@EnvironmentObject", file: "fiche_02_06_environment_object_en_swift_ui.md", track: "swiftui-only" },
      { num: "02.07", slug: "02-07", title: "@Environment", file: "fiche_02_07_environment_en_swift_ui.md", track: "swiftui-only" },
      { num: "02.08", slug: "02-08", title: "@AppStorage", file: "fiche_02_08_app_storage_en_swift_ui.md", track: "swiftui-only" },
      { num: "02.09", slug: "02-09", title: "@SceneStorage", file: "fiche_02_09_scene_storage_en_swift_ui.md", track: "swiftui-only" },
      { num: "02.10", slug: "02-10", title: "États d'écran : loading, loaded, empty, error", file: "fiche_02_10_etats_decran_swift_ui.md", track: "dual" },
      { num: "02.11", slug: "02-11", title: "@Observable et le modèle de présentation (iOS 17+)", file: "fiche_02_11_observable_viewmodel_moderne.md", track: "swiftui-only" },
      { num: "02.12", slug: "02-12", title: "Choisir l’état, la propriété et le binding", file: "fiche_02_12_choisir_etat_et_bindings.md", track: "swiftui-only" },
    ],
  },
  {
    num: "03",
    title: "UI, composants et design system",
    fiches: [
      { num: "03.01", slug: "03-01", title: "Créer des composants réutilisables", file: "fiche_03_01_composants_reutilisables_swift_ui.md", track: "dual" },
      { num: "03.02", slug: "03-02", title: "Bouton réutilisable", file: "fiche_03_02_bouton_reutilisable_swift_ui.md", track: "dual" },
      { num: "03.03", slug: "03-03", title: "Champ de texte réutilisable", file: "fiche_03_03_champ_de_texte_reutilisable_swift_ui.md", track: "dual" },
      { num: "03.04", slug: "03-04", title: "Cards et containers réutilisables", file: "fiche_03_04_cards_et_containers_swift_ui.md", track: "dual" },
      { num: "03.05", slug: "03-05", title: "Loading, Empty et Error Views réutilisables", file: "fiche_03_05_loading_empty_error_views_swift_ui.md", track: "dual" },
      { num: "03.06", slug: "03-06", title: "Design system simple : couleurs, typo, spacing", file: "fiche_03_06_design_system_swift_ui.md", track: "dual" },
      { num: "03.07", slug: "03-07", title: "Formulaires SwiftUI", file: "fiche_03_07_formulaires_swift_ui.md", track: "dual" },
      { num: "03.08", slug: "03-08", title: "Gestion du clavier avec @FocusState", file: "fiche_03_08_focusstate_clavier_swift_ui.md", track: "dual" },
      { num: "03.09", slug: "03-09", title: "Listes avancées : sections, swipe, suppression, édition", file: "fiche_03_09_listes_avancees_swift_ui.md", track: "dual" },
      { num: "03.10", slug: "03-10", title: "Grilles avec LazyVGrid et LazyHGrid", file: "fiche_03_10_grilles_lazy_vgrid_lazy_hgrid_swift_ui.md", track: "dual" },
      { num: "03.11", slug: "03-11", title: "Dark mode propre", file: "fiche_03_11_dark_mode_swift_ui.md", track: "dual" },
      { num: "03.12", slug: "03-12", title: "Accessibilité de base", file: "fiche_03_12_accessibilite_swift_ui.md", track: "dual" },
      { num: "03.13", slug: "03-13", title: "Human Interface Guidelines : les bases", file: "fiche_03_13_human_interface_guidelines.md" },
    ],
  },
  {
    num: "04",
    title: "Animations et gestures",
    fiches: [
      { num: "04.01", slug: "04-01", title: "Animations et transitions essentielles", file: "SwiftUI_Fiche_04_01_Animations_et_transitions_essentielles.md", track: "dual" },
      { num: "04.02", slug: "04-02", title: "Gestures essentielles : tap, long press, drag, swipe", file: "SwiftUI_Fiche_04_02_Gestures_essentielles_tap_long_press_drag_swipe.md", track: "dual" },
    ],
  },
  {
    num: "05",
    title: "Navigation SwiftUI",
    fiches: [
      { num: "05.01", slug: "05-01", title: "NavigationStack, NavigationLink et écran détail", file: "SwiftUI_Fiche_05_01_NavigationStack_NavigationLink_et_ecran_detail.md", track: "dual" },
      { num: "05.02", slug: "05-02", title: "Navigation programmatique avec routes enum", file: "SwiftUI_Fiche_05_02_Navigation_programmatique_avec_routes_enum.md", track: "dual" },
      { num: "05.03", slug: "05-03", title: "TabView, sheets, alerts, fullScreenCover et dismiss", file: "SwiftUI_Fiche_05_03_TabView_sheets_alerts_fullScreenCover_et_dismiss.md", track: "dual" },
      { num: "05.04", slug: "05-04", title: "Une variable change : pourquoi un écran s’ouvre ?", file: "fiche_05_04_navigation_pilotee_par_etat.md", track: "dual" },
      { num: "05.05", slug: "05-05", title: "Onglets, liens profonds, restauration et colonnes", file: "fiche_05_05_onglets_deep_links_et_split_view.md", track: "dual" },
      { num: "05.06", slug: "05-06", title: "Atelier : un carnet clients de bout en bout", file: "fiche_05_06_atelier_navigation.md", track: "dual" },
    ],
  },
  {
    num: "06",
    title: "Architecture SwiftUI / MVVM",
    fiches: [
      { num: "06.01", slug: "06-01", title: "Pourquoi l'architecture compte : MVC, MVVM, services", file: "SwiftUI_Fiche_06_01_Pourquoi_larchitecture_compte_MVC_MVVM_services.md" },
      { num: "06.02", slug: "06-02", title: "MVVM dans SwiftUI avec ViewModel", file: "SwiftUI_Fiche_06_02_MVVM_dans_SwiftUI_avec_ViewModel.md", track: "dual" },
      { num: "06.03", slug: "06-03", title: "Services, protocoles et dependency injection", file: "SwiftUI_Fiche_06_03_Services_protocoles_et_dependency_injection.md" },
      { num: "06.04", slug: "06-04", title: "Organisation des dossiers par feature", file: "SwiftUI_Fiche_06_04_Organisation_des_dossiers_par_feature.md" },
      { num: "06.05", slug: "06-05", title: "Clean Architecture version simple", file: "SwiftUI_Fiche_06_05_Clean_Architecture_version_simple.md" },
      { num: "06.06", slug: "06-06", title: "Router / Coordinator : navigation centralisée", file: "fiche_06_06_router_coordinator.md", track: "dual" },
      { num: "06.07", slug: "06-07", title: "Environnements dev / staging / prod", file: "fiche_06_07_environnements_dev_staging_prod.md" },
      { num: "06.08", slug: "06-08", title: "Les principes SOLID en Swift", file: "fiche_06_08_principes_solid.md" },
      { num: "06.09", slug: "06-09", title: "TCA (The Composable Architecture) : l'essentiel", file: "fiche_06_09_tca_intro.md" },
    ],
  },
  {
    num: "07",
    title: "Async, réseau et API REST",
    fiches: [
      { num: "07.01", slug: "07-01", title: "async/await, Task, .task et @MainActor", file: "SwiftUI_Fiche_07_01_async_await_Task_task_et_MainActor.md" },
      { num: "07.02", slug: "07-02", title: "HTTP, JSON et Codable", file: "SwiftUI_Fiche_07_02_HTTP_JSON_et_Codable.md" },
      { num: "07.03", slug: "07-03", title: "URLSession GET/POST avec async/await", file: "SwiftUI_Fiche_07_03_URLSession_GET_POST_avec_async_await.md" },
      { num: "07.04", slug: "07-04", title: "APIClient simple : endpoints, headers, erreurs", file: "SwiftUI_Fiche_07_04_APIClient_simple_endpoints_headers_erreurs.md" },
      { num: "07.05", slug: "07-05", title: "Auth REST propriétaire : login, token, refresh, logout", file: "SwiftUI_Fiche_07_05_Auth_REST_proprietaire_login_token_refresh_logout.md" },
      { num: "07.06", slug: "07-06", title: "Alamofire en pratique", file: "SwiftUI_Fiche_07_06_Alamofire_en_pratique.md" },
      { num: "07.07", slug: "07-07", title: "Concurrence : annulation, async let et TaskGroup", file: "fiche_07_07_concurrence_annulation_asynclet_taskgroup.md" },
      { num: "07.08", slug: "07-08", title: "Concurrence avancée : actors, Sendable, Swift 6 et continuations", file: "fiche_07_08_concurrence_actors_sendable_continuations.md" },
      { num: "07.09", slug: "07-09", title: "Réseau de production : pagination (offset/limit et cursor)", file: "fiche_07_09_reseau_pagination.md" },
      { num: "07.10", slug: "07-10", title: "Réseau de production : refresh token réel (single-flight)", file: "fiche_07_10_reseau_refresh_token_single_flight.md" },
      { num: "07.11", slug: "07-11", title: "Réseau de production : upload multipart, offline et erreurs métier", file: "fiche_07_11_reseau_upload_offline_erreurs.md" },
    ],
  },
  {
    num: "08",
    title: "Combine utile en SwiftUI",
    fiches: [
      { num: "08.01", slug: "08-01", title: "@Published, sink et AnyCancellable", file: "SwiftUI_Fiche_08_01_Published_sink_et_AnyCancellable.md" },
      { num: "08.02", slug: "08-02", title: "Debounce, validation formulaire et Combine dans MVVM", file: "SwiftUI_Fiche_08_02_Debounce_validation_formulaire_et_Combine_dans_MVVM.md" },
    ],
  },
  {
    num: "09",
    title: "Persistance locale",
    fiches: [
      { num: "09.01", slug: "09-01", title: "Quelle persistance choisir ?", file: "SwiftUI_Fiche_09_01_Quelle_persistance_choisir.md" },
      { num: "09.02", slug: "09-02", title: "UserDefaults et AppStorage", file: "SwiftUI_Fiche_09_02_UserDefaults_et_AppStorage.md" },
      { num: "09.03", slug: "09-03", title: "Keychain pour tokens", file: "SwiftUI_Fiche_09_03_Keychain_pour_tokens.md" },
      { num: "09.04", slug: "09-04", title: "Core Data essentiel (existant à savoir lire)", file: "SwiftUI_Fiche_09_04_Core_Data_essentiel.md" },
      { num: "09.05", slug: "09-05", title: "SwiftData en pratique (iOS 17+)", file: "fiche_09_05_swiftdata_en_pratique.md" },
      { num: "09.06", slug: "09-06", title: "FileManager et cache d'images", file: "fiche_09_06_filemanager_cache_images.md" },
      { num: "09.07", slug: "09-07", title: "Mode offline et synchronisation locale/distante", file: "fiche_09_07_mode_offline_sync.md" },
    ],
  },
  {
    num: "10",
    title: "Authentification",
    fiches: [
      { num: "10.01", slug: "10-01", title: "Session, access token, refresh token et AuthState", file: "SwiftUI_Fiche_10_01_Session_access_token_refresh_token_et_AuthState.md" },
      { num: "10.02", slug: "10-02", title: "Écrans login/register/forgot password", file: "SwiftUI_Fiche_10_02_Ecrans_login_register_forgot_password.md", track: "dual" },
      { num: "10.03", slug: "10-03", title: "Firebase Auth : email/password, Google, Apple, logout", file: "SwiftUI_Fiche_10_03_Firebase_Auth_email_password_Google_Apple_logout.md" },
    ],
  },
  {
    num: "11",
    title: "Backend serverless : Firebase et Supabase",
    fiches: [
      { num: "11.01", slug: "11-01", title: "Installer Firebase dans une app SwiftUI", file: "SwiftUI_Fiche_11_01_Installer_Firebase_dans_une_app_SwiftUI.md" },
      { num: "11.02", slug: "11-02", title: "Firebase Auth en pratique", file: "SwiftUI_Fiche_11_02_Firebase_Auth_en_pratique.md" },
      { num: "11.03", slug: "11-03", title: "Firestore : collections, documents et CRUD", file: "SwiftUI_Fiche_11_03_Firestore_collections_documents_et_CRUD.md" },
      { num: "11.04", slug: "11-04", title: "Firestore temps réel avec listeners", file: "SwiftUI_Fiche_11_04_Firestore_temps_reel_avec_listeners.md" },
      { num: "11.05", slug: "11-05", title: "Firebase Storage : upload/download image", file: "SwiftUI_Fiche_11_05_Firebase_Storage_upload_download_image.md" },
      { num: "11.06", slug: "11-06", title: "FCM, Crashlytics et règles de sécurité en intro", file: "SwiftUI_Fiche_11_06_FCM_Crashlytics_et_regles_de_securite_en_intro.md" },
      { num: "11.07", slug: "11-07", title: "Supabase avec Swift : Auth, Postgres, Realtime, Storage", file: "fiche_11_07_supabase_swift.md" },
      { num: "11.08", slug: "11-08", title: "Règles de sécurité backend : Firestore Rules et Postgres RLS", file: "fiche_11_08_regles_securite_backend.md" },
    ],
  },
  {
    num: "12",
    title: "Permissions et système iOS",
    fiches: [
      { num: "12.01", slug: "12-01", title: "Permissions iOS", file: "SwiftUI_Fiche_12_01_Permissions_iOS.md" },
      { num: "12.02", slug: "12-02", title: "PhotosPicker et caméra", file: "SwiftUI_Fiche_12_02_PhotosPicker_et_camera.md", track: "dual" },
      { num: "12.03", slug: "12-03", title: "Localisation simple", file: "SwiftUI_Fiche_12_03_Localisation_simple.md" },
      { num: "12.04", slug: "12-04", title: "Notifications locales et ouverture des réglages", file: "SwiftUI_Fiche_12_04_Notifications_locales_et_ouverture_des_reglages.md" },
    ],
  },
  {
    num: "13",
    title: "UIKit avec SwiftUI",
    fiches: [
      { num: "13.01", slug: "13-01", title: "Intégrer UIKit dans SwiftUI", file: "SwiftUI_Fiche_13_01_Int_grer_UIKit_dans_SwiftUI.md" },
      { num: "13.02", slug: "13-02", title: "Intégrer SwiftUI dans UIKit", file: "SwiftUI_Fiche_13_02_Int_grer_SwiftUI_dans_UIKit.md" },
    ],
  },
  {
    num: "14",
    title: "Tests",
    fiches: [
      { num: "14.01", slug: "14-01", title: "Pourquoi tester et XCTest", file: "SwiftUI_Fiche_14_01_Pourquoi_tester_et_XCTest.md" },
      { num: "14.02", slug: "14-02", title: "Tester un ViewModel", file: "SwiftUI_Fiche_14_02_Tester_un_ViewModel.md" },
      { num: "14.03", slug: "14-03", title: "Tester un service avec mock", file: "SwiftUI_Fiche_14_03_Tester_un_service_avec_mock.md" },
      { num: "14.04", slug: "14-04", title: "Tester async/await simplement", file: "SwiftUI_Fiche_14_04_Tester_async_await_simplement.md" },
      { num: "14.05", slug: "14-05", title: "Swift Testing : le framework de test moderne", file: "fiche_14_05_swift_testing.md" },
      { num: "14.06", slug: "14-06", title: "Tester l'async réel : spies et URLProtocol mock", file: "fiche_14_06_tester_async_spies_urlprotocol.md" },
    ],
  },
  {
    num: "15",
    title: "Debug, qualité et production",
    fiches: [
      { num: "15.01", slug: "15-01", title: "Xcode debugger, breakpoints et console", file: "SwiftUI_Fiche_15_01_Xcode_debugger_breakpoints_et_console.md" },
      { num: "15.02", slug: "15-02", title: "Memory Graph, leaks et retain cycles", file: "SwiftUI_Fiche_15_02_Memory_Graph_leaks_et_retain_cycles.md" },
      { num: "15.03", slug: "15-03", title: "Instruments Time Profiler", file: "SwiftUI_Fiche_15_03_Instruments_Time_Profiler.md" },
      { num: "15.04", slug: "15-04", title: "Crashlytics, logs et erreurs non fatales", file: "SwiftUI_Fiche_15_04_Crashlytics_logs_et_erreurs_non_fatales.md" },
      { num: "15.05", slug: "15-05", title: "Préparer une app pour l'App Store", file: "SwiftUI_Fiche_15_05_Pr_parer_une_app_pour_lApp_Store.md" },
      { num: "15.06", slug: "15-06", title: "Performance SwiftUI : re-renders et granularité @Observable", file: "fiche_15_06_performance_swiftui_rerenders.md", track: "swiftui-only" },
      { num: "15.07", slug: "15-07", title: "Listes et images performantes + Instruments", file: "fiche_15_07_performance_listes_images_instruments.md" },
      { num: "15.08", slug: "15-08", title: "ARC en pratique : deinit, weak vs unowned et fuites async", file: "fiche_15_08_arc_deinit_weak_unowned_fuites.md" },
      { num: "15.09", slug: "15-09", title: "Publier sur l'App Store, pas à pas", file: "fiche_15_09_publication_app_store_pas_a_pas.md" },
    ],
  },
  {
    num: "16",
    title: "Compétences entreprise iOS",
    fiches: [
      { num: "16.01", slug: "16-01", title: "Git essentiel pour travailler en équipe", file: "SwiftUI_Fiche_16_01_Git_essentiel_pour_travailler_en_quipe.md" },
      { num: "16.02", slug: "16-02", title: "Pull Request, code review et travail en équipe", file: "SwiftUI_Fiche_16_02_Pull_Request_code_review_et_travail_en_quipe.md" },
      { num: "16.03", slug: "16-03", title: "Agile, Scrum, Jira et organisation produit", file: "SwiftUI_Fiche_16_03_Agile_Scrum_Jira_et_organisation_produit.md" },
      { num: "16.04", slug: "16-04", title: "Dépendances iOS : SPM et CocoaPods", file: "SwiftUI_Fiche_16_04_D_pendances_iOS_Swift_Package_Manager_et_CocoaPods.md" },
      { num: "16.05", slug: "16-05", title: "CI/CD, Fastlane et TestFlight", file: "SwiftUI_Fiche_16_05_CI_CD_Fastlane_et_TestFlight_en_version_simple.md" },
      { num: "16.06", slug: "16-06", title: "Lire et reprendre un projet iOS existant", file: "SwiftUI_Fiche_16_06_Lire_et_reprendre_un_projet_iOS_existant.md" },
      { num: "16.07", slug: "16-07", title: "Lecture rapide : Objective-C, Realm, GraphQL", file: "SwiftUI_Fiche_16_07_Lecture_rapide_Objective_C_Realm_et_GraphQL.md" },
      { num: "16.08", slug: "16-08", title: "Qualité pro outillée : SwiftLint, CI GitHub Actions, DocC et Git avancé", file: "fiche_16_08_qualite_pro_outillee.md" },
    ],
  },
  {
    num: "17",
    title: "Projet final condensé",
    fiches: [
      { num: "17.01", slug: "17-01", title: "Structure du mini projet final", file: "SwiftUI_Fiche_17_01_Structure_du_mini_projet_final.md" },
      { num: "17.02", slug: "17-02", title: "App complète : SwiftUI, MVVM, API, Firebase, persistance, tests, debug", file: "SwiftUI_Fiche_17_02_App_compl_te_SwiftUI_MVVM_API_Firebase_persistance_tests_debug.md" },
      { num: "17.03", slug: "17-03", title: "Projet fil-rouge : une app complète à construire (portfolio)", file: "fiche_17_03_projet_fil_rouge.md" },
      { num: "17.04", slug: "17-04", title: "Banque d'exercices et quiz d'entretien iOS", file: "fiche_17_04_exercices_et_quiz_entretien.md" },
      { num: "17.05", slug: "17-05", title: "Vérifier ses compétences avant de candidater", file: "fiche_17_05_validation_competences_emploi.md" },
    ],
  },
  {
    num: "18",
    title: "Sécurité et vie privée iOS",
    fiches: [
      { num: "18.01", slug: "18-01", title: "Sécurité iOS : modèle de menace, secrets et réseau", file: "fiche_18_01_securite_modele_menace_secrets_reseau.md" },
      { num: "18.02", slug: "18-02", title: "Vie privée : Privacy Manifest, Keychain durci et RGPD", file: "fiche_18_02_privacy_manifest_keychain_rgpd.md" },
    ],
  },
];

export const allFiches: Fiche[] = sommaire.flatMap((p) => p.fiches);

export function getFicheBySlug(slug: string): Fiche | undefined {
  return allFiches.find((f) => f.slug === slug);
}

export function getAdjacentFiches(slug: string): { prev?: Fiche; next?: Fiche } {
  const index = allFiches.findIndex((f) => f.slug === slug);
  if (index === -1) return {};
  return {
    prev: index > 0 ? allFiches[index - 1] : undefined,
    next: index < allFiches.length - 1 ? allFiches[index + 1] : undefined,
  };
}

export function getPartieByFicheSlug(slug: string): Partie | undefined {
  return sommaire.find((p) => p.fiches.some((f) => f.slug === slug));
}
