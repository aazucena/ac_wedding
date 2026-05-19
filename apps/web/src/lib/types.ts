export interface Accomodations {
  id: string;
  sort?: number;
  user_created?: DirectusUsers;
  date_created?: string;
  user_updated?: DirectusUsers;
  date_updated?: string;
  vendor?: Vendors;
  description?: string;
  price: number;
  currency?: string;
  notes?: string;
  booking_url?: string;
  booking_deadline?: string;
  status: string;
  accordion?: any;
  booking?: any;
}

export interface BudgetAdjustments {
  id: string;
  user_created?: DirectusUsers;
  date_created?: string;
  user_updated?: DirectusUsers;
  date_updated?: string;
  category?: BudgetCategories;
  previous_amount?: number;
  new_amount?: number;
  reason?: string;
  date_adjusted?: string;
  adjusted_by?: string;
  notes?: string;
}

export interface BudgetCategories {
  id: string;
  ceiling_amount?: number;
  contingency_percent?: number;
  amount_allocated?: number;
  amount_paid?: number;
  is_over_budget?: boolean;
  notes?: string;
  name?: string;
  color?: string;
}

export interface BudgetItems {
  id: string;
  sort?: number;
  user_created?: DirectusUsers;
  date_created?: string;
  user_updated?: DirectusUsers;
  date_updated?: string;
  category?: BudgetCategories;
  label?: string;
  description?: string;
  estimated_amount?: number;
  actual_amount?: number;
  notes?: string;
  payments?: Payments[];
}

export interface Ceremonies {
  id: string;
  user_created?: DirectusUsers;
  date_created?: string;
  user_updated?: DirectusUsers;
  date_updated?: string;
  start_time?: string;
  dress_code?: string;
  parking_notes?: string;
  clergy?: Clergies;
  mass_booklet_url?: string;
  venue?: Vendors;
  status?: string;
  dress_code_description?: string;
  estimated_duration?: number;
  liturgical_ministers?: LiturgicalMinisters[];
  programs?: CeremonyOrder[];
  entourage?: Entourage[];
}

export interface CeremonyOrder {
  id: string;
  sort?: number;
  label: string;
  type?: string;
  assigned_role?: string;
  duration_minutes?: number;
  notes?: string;
  items_sort?: number;
  parent?: CeremonyOrder;
  reading?: Readings;
  music?: MassMusic;
  order_sort?: number;
  ceremony?: Ceremonies;
  optional?: boolean;
  assigned_to?: Persons;
  children?: CeremonyOrder[];
}

export interface ChecklistSections {
  id: string;
  name: string;
  color?: string;
  sort?: number;
  vendor?: Vendors;
  tasks?: ChecklistTasks[];
}

export interface ChecklistTasks {
  id: string;
  section_id: ChecklistSections;
  task_name: string;
  description?: string;
  status?: string;
  priority?: string;
  due_date?: string;
  sort?: number;
  notes?: string;
  section_sort?: number;
  assigned_to?: Persons;
  vendor?: Vendors;
}

export interface Clergies {
  id: string;
  user_created?: DirectusUsers;
  date_created?: string;
  user_updated?: DirectusUsers;
  date_updated?: string;
  person?: Persons;
  parish?: string;
  diocese?: string;
  title?: string;
}

export interface Contracts {
  id: string;
  user_created?: DirectusUsers;
  date_created?: string;
  user_updated?: DirectusUsers;
  date_updated?: string;
  title?: string;
  status?: string;
  total_value?: number;
  date_signed?: string;
  contract_file?: DirectusFiles;
  balance_due?: number;
  notes?: string;
  vendor?: Vendors;
  payments?: Payments[];
}

export interface Entourage {
  id: string;
  sequence_order?: number;
  recessional_order?: number;
  notes?: string;
  person?: Persons;
  attire_override?: string;
  confirmed?: boolean;
  proxy?: boolean;
  role?: WeddingRoles;
  contact_phone?: string;
  ceremony?: Ceremonies;
  pair_group?: number;
}

export interface Events {
  id: string;
  status: string;
  user_created?: DirectusUsers;
  date_created?: string;
  user_updated?: DirectusUsers;
  date_updated?: string;
  name: string;
  date?: string;
  end_time?: string;
  start_time?: string;
  notes?: string;
  venue?: Vendors;
  host?: Persons;
  public?: boolean;
}

export interface Gallery {
  id: string;
  sort?: number;
  user_created?: DirectusUsers;
  date_created?: string;
  user_updated?: DirectusUsers;
  date_updated?: string;
  title?: string;
  description?: string;
  image?: DirectusFiles;
  uploaded_by_token?: string;
  status?: string;
  featured?: boolean;
  category?: string | null;
  bw?: boolean | null;
}

export interface Groups {
  id: string;
  user_created?: DirectusUsers;
  date_created?: string;
  user_updated?: DirectusUsers;
  date_updated?: string;
  name: string;
  side?: string;
  notes?: string;
  representative?: Persons;
  members?: Parties[];
}

export interface Guests {
  id: string;
  dietary_restrictions?: string;
  notes?: string;
  person?: Persons;
  attending?: boolean;
  attendance?: Array<'ceremony' | 'reception'>;
  table?: Tables;
  party?: Parties;
  type?: string;
  extra?: boolean;
}

export interface Honeymoon {
  id: string;
  destination?: string;
  total_nights?: number;
  estimated_budget?: number;
  notes?: string;
  status?: string;
  date_departure?: string;
  date_return?: string;
  itinerary?: HoneymoonItinerary;
}

export interface HoneymoonActivities {
  id: string;
  user_created?: DirectusUsers;
  date_created?: string;
  user_updated?: DirectusUsers;
  date_updated?: string;
  notes?: string;
  name?: string;
  difficulty_level?: string;
  packing_list?: any;
}

export interface HoneymoonEvents {
  id: string;
  user_created?: DirectusUsers;
  date_created?: string;
  user_updated?: DirectusUsers;
  date_updated?: string;
  notes?: string;
  name?: string;
  tickets?: any;
  start_time?: string;
}

export interface HoneymoonItinerary {
  id: string;
  sort?: number;
  user_created?: DirectusUsers;
  date_created?: string;
  user_updated?: DirectusUsers;
  date_updated?: string;
  date?: string;
  start_time?: string;
  end_time?: string;
  title?: string;
  location?: string;
  vendor?: Vendors;
  confirmation_number?: string;
  date_booked?: string;
  estimated_cost?: number;
  estimated_duration?: string;
  notes?: string;
  status?: string;
  weather_sensitive?: boolean;
  honeymoon?: Honeymoon;
  item?: string;
  collection?: string;
}

export interface HoneymoonMeals {
  id: string;
  user_created?: DirectusUsers;
  date_created?: string;
  user_updated?: DirectusUsers;
  date_updated?: string;
  notes?: string;
  cuisine?: string;
  dress_code?: string;
  meal_type?: string;
}

export interface HoneymoonStays {
  id: string;
  user_created?: DirectusUsers;
  date_created?: string;
  user_updated?: DirectusUsers;
  date_updated?: string;
  notes?: string;
  date_check_in?: string;
  date_check_out?: string;
  nights?: number;
  room_type?: string;
  breakfast_included?: boolean;
}

export interface HoneymoonTransport {
  id: string;
  user_created?: DirectusUsers;
  date_created?: string;
  user_updated?: DirectusUsers;
  date_updated?: string;
  notes?: string;
  type?: string;
  from_location?: string;
  to_location?: string;
  estimated_distance?: number;
  scenic_stops?: any;
}

export interface Invitations {
  id: string;
  channel?: string;
  status?: string;
  sent_at?: string;
  opened_at?: string;
  template_version?: string;
  error_message?: string;
  party?: Parties;
}

export interface LiturgicalMinisters {
  id: string;
  user_created?: DirectusUsers;
  date_created?: string;
  user_updated?: DirectusUsers;
  date_updated?: string;
  person?: Persons;
  role?: string;
  confirmed?: boolean;
  confirmed_by?: Clergies;
  brief?: string;
  notes?: string;
  ceremony?: Ceremonies;
}

export interface MarriagePrep {
  id: string;
  requirement: string;
  category?: string;
  description?: string;
  due_date?: string;
  completed_at?: string;
  status?: string;
  document_file?: DirectusFiles;
  issuing_authority?: string;
  notes?: string;
  assigned_to?: string;
}

export interface MassMusic {
  id: string;
  slot?: string;
  title: string;
  composer?: string;
  hymnal_reference?: string;
  approval_status?: string;
  approval_notes?: string;
  notes?: string;
  date_approved?: string;
  proposed_by?: Persons;
  approved_by?: Persons;
  performed_by?: Persons;
}

export interface Memories {
  id: string;
  user_created?: DirectusUsers;
  date_created?: string;
  user_updated?: DirectusUsers;
  date_updated?: string;
  image?: DirectusFiles;
  title?: string;
  description?: string;
  reception?: Reception;
  guest?: Guests;
  source?: 'game' | 'rsvp' | null;
}

export interface Parties {
  id: string;
  user_created?: DirectusUsers;
  date_created?: string;
  user_updated?: DirectusUsers;
  date_updated?: string;
  name: string;
  rsvp_token?: string;
  hotel?: boolean;
  transportation?: boolean;
  date_invitation_sent?: string;
  invitation_sent?: boolean;
  message_to_couple?: string;
  date_rsvp_submitted?: string;
  notes?: string;
  status?: string;
  song_request?: string;
  representative?: Persons;
  group?: Groups;
  members: Guests[];
  invitation_type?: 'guest' | 'sponsor' | 'entourage';
  invitation_label?: string;
  plus_ones_allowed?: number | null;
}

export interface Payments {
  id: string;
  user_created?: DirectusUsers;
  date_created?: string;
  user_updated?: DirectusUsers;
  date_updated?: string;
  contract?: Contracts;
  amount?: number;
  date_deadline?: string;
  date_paid?: string;
  payment_method?: string;
  receipt_file?: DirectusFiles;
  notes?: string;
  budget_item?: BudgetItems;
  category?: BudgetCategories;
}

export interface Persons {
  user_created?: DirectusUsers;
  date_created?: string;
  user_updated?: DirectusUsers;
  date_updated?: string;
  first_name?: string;
  last_name?: string;
  middle_name?: string;
  preferred_name?: string;
  email?: string;
  phone?: string;
  notes?: string;
  account?: DirectusUsers;
  vendor?: Vendors;
  id: string;
  gender?: string;
}

export interface Petitions {
  id: string;
  date_created?: string;
  date_updated?: string;
  reading?: Readings;
  readings_sort?: number;
  intention?: string;
  assigned_to?: Persons;
  confirmed?: boolean;
  sort?: number;
  notes?: string;
}

export interface Readings {
  id: string;
  type?: string;
  book?: string;
  translation?: string;
  reader_confirmed?: boolean;
  approved?: boolean;
  notes?: string;
  label?: string;
  scripture?: string;
  reader?: Persons;
  full_reference?: any;
  petitions?: Petitions[];
}

export interface Reception {
  id: string;
  cocktail_hour_time?: string;
  notes?: string;
  start_time?: string;
  end_time?: string;
  venue?: Vendors;
  status?: string;
  dress_code?: string;
  dress_code_description?: string;
  programs?: ReceptionProgram[];
  staff?: ReceptionStaff[];
  tables?: Tables[];
  memories?: Memories[];
}

export interface ReceptionProgram {
  id: string;
  sort?: number;
  type?: string;
  emcee_script?: string;
  estimated_start_time?: string;
  av_notes?: string;
  notes?: string;
  program_sort?: number;
  assigned_to?: Persons;
  parent?: ReceptionProgram;
  reception?: Reception;
  duration?: number;
  label: string;
  music_playlist?: any;
  children?: ReceptionProgram[];
}

export interface ReceptionStaff {
  id: string;
  user_created?: DirectusUsers;
  date_created?: string;
  user_updated?: DirectusUsers;
  date_updated?: string;
  person?: Persons;
  role?: WeddingRoles;
  status?: string;
  relationship?: any;
  vendor?: Vendors;
  notes?: string;
  reception?: Reception;
  reception_sort?: number;
}

export interface Registries {
  id: string;
  status: string;
  user_created?: DirectusUsers;
  date_created?: string;
  user_updated?: DirectusUsers;
  date_updated?: string;
  url?: string;
  name: string;
  notes?: string;
  sort?: number;
}

export interface Sponsors {
  id: string;
  sort?: number;
  user_created?: DirectusUsers;
  date_created?: string;
  user_updated?: DirectusUsers;
  date_updated?: string;
  person?: Persons;
  role?: string;
  confirmed?: boolean;
  notes?: string;
  partner?: Sponsors;
}

export interface Stories {
  id: string;
  user_created?: DirectusUsers;
  date_created?: string;
  user_updated?: DirectusUsers;
  date_updated?: string;
  cover_image?: DirectusFiles;
  summary?: string;
  headline?: string;
  title?: string;
  chapters?: StoryChapters[];
}

export interface StoryChapters {
  id: string;
  sort?: number;
  user_created?: DirectusUsers;
  date_created?: string;
  user_updated?: DirectusUsers;
  date_updated?: string;
  story?: Stories;
  story_sort?: number;
  headline?: string;
  icon?: string;
  title?: string;
  content?: string;
  image?: DirectusFiles;
}

export interface Tables {
  id: string;
  user_created?: DirectusUsers;
  date_created?: string;
  user_updated?: DirectusUsers;
  date_updated?: string;
  status?: string;
  number?: number;
  name?: string;
  capacity?: number;
  section?: string;
  notes?: string;
  party?: Parties;
  reception?: Reception;
  reception_sort?: number;
  guests?: Guests[];
}

export interface Vendors {
  id: string;
  name: string;
  subtitle?: string;
  category?: string;
  sort?: number;
  featured?: boolean;
  website?: string;
  status?: string;
  notes?: string;
  maps_url?: string;
  email?: string;
  phone?: string;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  region?: string;
  postal_code?: string;
  country?: string;
  image?: DirectusFiles;
  logo?: DirectusFiles;
  contacts?: Persons[];
  contracts?: Contracts[];
  address?: any;
  social_media?: Array<{ platform: string; url: string }>;
}

export interface WeddingRoles {
  id: string;
  sort?: number;
  date_created?: string;
  date_updated?: string;
  name: string;
  attire_description?: string;
  attire_color?: string;
  notes?: string;
  type?: string;
}

export interface WeddingSettings {
  id: string;
  wedding_date?: string;
  hashtag?: string;
  rsvp_deadline?: string;
  overall_budget?: number;
  contingency_percent?: number;
  color_primary?: string;
  color_secondary?: string;
  bride?: Persons;
  groom?: Persons;
  announcement_format?: string;
  announcement_script?: string;
  estimated_guests?: number;
  confirmed_guests?: number;
  ceremony?: Ceremonies;
  reception?: Reception;
  faqs?: Faqs[];
  location?: string;
  rsvp_enabled?: boolean;
  game_deadline?: string;
  story?: Stories;
  honeymoon?: Honeymoon;
  dress_code?: string;
  dress_code_description?: string;
  directions?: any;
  accomodation?: Accomodations;
  'accordion-5v4tn4'?: any;
  rsvp?: any;
  announcement?: any;
  dress_code_group?: any;
  phone?: string;
  email?: string;
  mc_token?: string;
  maintenance?: boolean;
  return_address_line1?:       string;
  return_address_city?:        string;
  return_address_region?:      string;
  return_address_postal_code?: string;
  emblem?: DirectusFiles;
  insignia?: DirectusFiles;
  logos?: any;
  photographer?: string | Vendors;
  plus_ones_allowed?: number;
}

export interface Faqs {
  question: string;
  answer: string;
}

export interface DirectusUsers {
  id: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  password?: string;
  location?: string;
  title?: string;
  description?: string;
  tags?: any;
  avatar?: DirectusFiles;
  language?: string;
  tfa_secret?: string;
  status: string;
  role?: DirectusRoles;
  token?: string;
  last_access?: string;
  last_page?: string;
  provider: string;
  external_identifier?: string;
  auth_data?: any;
  email_notifications?: boolean;
  appearance?: string;
  theme_dark?: string;
  theme_light?: string;
  theme_light_overrides?: any;
  theme_dark_overrides?: any;
  text_direction: string;
  identities?: Persons[];
  preferences_divider?: any;
  theming_divider?: any;
  admin_divider?: any;
  policies?: DirectusAccess[];
}

export interface DirectusFiles {
  id: string;
  storage: string;
  filename_disk?: string;
  filename_download: string;
  title?: string;
  type?: string;
  folder?: DirectusFolders;
  uploaded_by?: DirectusUsers;
  created_on: string;
  modified_by?: DirectusUsers;
  modified_on: string;
  charset?: string;
  filesize?: number;
  width?: number;
  height?: number;
  duration?: number;
  embed?: string;
  description?: string;
  location?: string;
  tags?: any;
  metadata?: any;
  focal_point_x?: number;
  focal_point_y?: number;
  tus_id?: string;
  tus_data?: any;
  uploaded_on?: string;
  focal_point_divider?: any;
  storage_divider?: any;
}

export interface DirectusRoles {
  id: string;
  name: string;
  icon: string;
  description?: string;
  parent?: DirectusRoles;
  children?: DirectusRoles[];
  policies?: DirectusAccess[];
  users_group?: any;
  users_divider?: any;
  users?: DirectusUsers[];
}

export interface DirectusAccess {
  id: string;
  role?: DirectusRoles;
  user?: DirectusUsers;
  policy: DirectusPolicies;
  sort?: number;
}

export interface DirectusFolders {
  id: string;
  name: string;
  parent?: DirectusFolders;
}

export interface DirectusPolicies {
  id: string;
  name: string;
  icon: string;
  description?: string;
  ip_access?: string[];
  enforce_tfa: boolean;
  admin_access: boolean;
  app_access: boolean;
  permissions?: DirectusPermissions[];
  assigned_to_divider?: any;
  users?: DirectusAccess[];
  roles?: DirectusAccess[];
}

export interface DirectusPermissions {
  id: number;
  collection: string;
  action: string;
  permissions?: any;
  validation?: any;
  presets?: any;
  fields?: string[];
  policy: DirectusPolicies;
}