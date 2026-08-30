from decimal import Decimal
import json
from app.database import SessionLocal
from app.cobi_kerupuk import service, models, schemas


def main():
    db = SessionLocal()
    try:
        # Create ingredient with unit 'tsp'
        ing = models.Ingredient(name='CI Test Ingredient tsp', unit='tsp', current_price=Decimal('100'), yield_percent=Decimal('100'))
        db.add(ing)
        db.commit()
        db.refresh(ing)
        print('ingredient id', ing.id)

        # Create a recipe group
        rg = models.RecipeGroup(name='CI Test Recipe Copy Unit', base_yield_grams=Decimal('200'))
        db.add(rg)
        db.commit()
        db.refresh(rg)
        print('recipe_group id', rg.id)

        # Create a recipe version using tsp
        payload = schemas.RecipeVersionCreate(note='test copy unit', ingredients=[schemas.RecipeIngredientInput(ingredient_id=ing.id, qty=Decimal('1'), unit='tsp')])
        version = service.create_recipe_version(db, rg.id, payload)
        print('version id', version.id)

        # Fetch detail
        detail = service.get_recipe_version_detail(db, version.id)
        print('detail:')
        print(json.dumps(detail, default=str, indent=2))
    finally:
        db.close()


if __name__ == '__main__':
    main()
