import { Entity, PrimaryColumn } from "typeorm";

//Kategoria: nazwa (typu tekst) - Kategorie można uznać za predefiniowane, tzn. nie potrzeba API dla ich dodawania/usuwania ale zestaw dopuszczanych kategorii powinien znajdować się w bazie danych. Kategorie mają strukturę płaską, czyli nie ma "podkategorii"

export enum CategoryName {
  Electronics = "Electronics",
  Clothing = "Clothing",
  Home = "Home",
  Books = "Books",
  Sports = "Sports",
}

@Entity()
export class Category {
  @PrimaryColumn()
  name!: CategoryName;
}
