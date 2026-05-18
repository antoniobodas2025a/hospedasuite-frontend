# Room Templates Specification

## Purpose

Define the ROOM_TEMPLATES registry that provides pre-configured room templates per property type, reducing cognitive load vs empty forms.

## Requirements

### Requirement: Template Registry

The system MUST provide a ROOM_TEMPLATES registry in `src/lib/room-templates.ts` mapping property types to template arrays. Each template MUST have: id, name, suggestedAmenities[], defaultCapacity, defaultBeds, priceRange.

| Scenario | GIVEN | WHEN | THEN |
|----------|-------|------|------|
| Hotel templates | Property type="Hotel" | Templates queried | Returns "Habitación Estándar", "Suite Premium", "Habitación Doble" |
| Glamping templates | Property type="Glamping" | Templates queried | Returns "Domo Estelar", "Cabaña Premium", "Tienda de Lujo" |
| Cabañas templates | Property type="Cabañas" | Templates queried | Returns "Cabaña Familiar", "Cabaña Romántica", "Cabaña con Jacuzzi" |
| Hostal templates | Property type="Hostal" | Templates queried | Returns "Cama en Dormitorio", "Habitación Privada" |
| Apartamento templates | Property type="Apartamento" | Templates queried | Returns "Apartamento Completo", "Studio" |
| Unknown type | Property type="Resort" | Templates queried | Returns empty array |

### Requirement: Template Pre-Fill

When a user selects a room template, the system MUST pre-fill the room form with the template's name, suggested amenities, default capacity, and suggested price range.

| Scenario | GIVEN | WHEN | THEN |
|----------|-------|------|------|
| Standard room | User selects "Habitación Estándar" | Room form opens | Name=template name, amenities=template amenities, capacity=defaultCapacity |
| Suite | User selects "Suite Premium" | Room form opens | Name="Suite Premium", premium amenities, higher capacity |
| Editable pre-fill | Template pre-filled | User changes name | User's changes override template values |
| Partial fill | Template has no priceRange | Room form opens | Price field empty, user must enter |

### Requirement: Amenity Registry

The system MUST provide an AMENITY_REGISTRY listing all available amenities that can be toggled for rooms and hotels. Each amenity MUST have: id, name, icon, category.

| Scenario | GIVEN | WHEN | THEN |
|----------|-------|------|------|
| Room amenities | Room form open | User views amenity toggles | All amenities from registry displayed |
| Hotel amenities | Step 5 open | User views amenity toggles | All amenities from registry displayed |
| Category filter | Amenities shown | User views | Amenities grouped by category (e.g., "Conectividad", "Comodidades") |
