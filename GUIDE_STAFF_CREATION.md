# Guide: Skapa anställda med inloggningskonton

Det finns två sätt att skapa anställda med inloggningskonton:

## Metod 1: Via Supabase Dashboard (Rekommenderad för nu)

Detta är det enklaste sättet och fungerar direkt:

### Steg 1: Skapa användare i Supabase Auth

1. Gå till **Supabase Dashboard** > **Authentication** > **Users**
2. Klicka på **"Add user"** eller **"Invite user"**
3. Fyll i:
   - **Email**: Anställdens e-postadress
   - **Password**: Ett temporärt lösenord (användaren kan ändra detta senare)
   - **Auto Confirm User**: Aktivera detta så användaren kan logga in direkt
4. Klicka på **"Create user"** eller **"Send invitation"**

### Steg 2: Verifiera att användaren skapades

Efter att användaren skapats kommer en post automatiskt skapas i `admin_users`-tabellen med rollen `employee` (via trigger).

Du kan verifiera detta genom att köra:

```sql
SELECT * FROM admin_users WHERE email = 'anstalldens@email.se';
```

### Steg 3: Skapa post i employees-tabellen

Nu behöver du skapa en post i `employees`-tabellen med samma ID som användaren:

```sql
-- Hämta användarens ID från admin_users
SELECT id FROM admin_users WHERE email = 'anstalldens@email.se';

-- Skapa post i employees (ersätt USER_ID med ID från ovan)
INSERT INTO employees (
  id,
  name,
  phone,
  location,
  position,
  hire_date,
  notes,
  is_active
) VALUES (
  'USER_ID',  -- Samma ID som i admin_users
  'Namn på anställd',
  '070-1234567',  -- Valfritt
  'both',  -- eller 'malmo' eller 'staffanstorp'
  'Anställningstyp',  -- Valfritt
  '2024-01-01',  -- Anställningsdatum
  'Anteckningar',  -- Valfritt
  true
);
```

### Steg 4: Användaren kan nu logga in

Användaren kan nu logga in på `/admin` med sin e-post och lösenord.

---

## Metod 2: Via Admin Panel (Endast Admin)

Nu kan admin skapa anställda direkt från admin-panelen! Detta använder en Netlify Function som använder Supabase Admin API.

### Steg 1: Konfigurera Netlify Environment Variables

Du behöver lägga till Supabase Service Role Key i Netlify:

1. Gå till **Netlify Dashboard** > **Site settings** > **Environment variables**
2. Lägg till följande variabler:
   - `SUPABASE_SERVICE_ROLE_KEY` - Hämta detta från Supabase Dashboard > Settings > API > Service Role Key (håll denna hemlig!)
   - `VITE_SUPABASE_URL` - Om den inte redan finns
   - `VITE_SUPABASE_ANON_KEY` - Om den inte redan finns

**Viktigt:** Service Role Key ger full åtkomst till din databas, så håll den hemlig!

### Steg 2: Installera Dependencies för Netlify Function

Netlify Functions behöver `@supabase/supabase-js` package. Kontrollera att det finns i `package.json` (det borde redan finnas).

Om du behöver installera det manuellt:
```bash
npm install @supabase/supabase-js
```

### Steg 3: Skapa Anställd från Admin Panel

1. Logga in som **admin** (endast admin kan skapa nya konton)
2. Gå till **Personal & Schema** i admin-panelen
3. Klicka på **"Lägg till anställd"**
4. Fyll i formuläret:
   - **Namn** (obligatoriskt)
   - **E-post** (obligatoriskt)
   - **Lösenord** (endast för nya konton - lämna tomt om användaren redan finns)
   - Övriga fält (valfritt)
5. Klicka på **"Skapa anställd"**

**Hur det fungerar:**
- Om du anger lösenord skapas ett nytt inloggningskonto automatiskt
- Om du lämnar lösenord tomt försöker systemet hitta en befintlig användare med samma e-post
- Om användaren inte finns och du inte angav lösenord, kommer systemet fråga om du vill skapa ett nytt konto

**OBS:** Endast admin kan skapa nya inloggningskonton. Platschef kan bara länka till befintliga konton.

---

## Tips

### Ändra användarens roll

Om du vill ändra en användares roll (t.ex. från `employee` till `platschef`):

```sql
UPDATE admin_users 
SET role = 'platschef' 
WHERE email = 'anstalldens@email.se';
```

### Inaktivera en anställd

För att inaktivera en anställd (de kan fortfarande logga in men visas inte i listor):

```sql
UPDATE employees 
SET is_active = false 
WHERE id = 'USER_ID';
```

### Ta bort en anställd

För att ta bort en anställd helt:

```sql
-- Detta tar automatiskt bort från employees, admin_users och auth.users
-- på grund av CASCADE constraints
DELETE FROM auth.users WHERE id = 'USER_ID';
```

---

## Felsökning

### Användaren kan inte logga in

1. Kontrollera att användaren finns i `auth.users`:
   ```sql
   SELECT * FROM auth.users WHERE email = 'anstalldens@email.se';
   ```

2. Kontrollera att användaren finns i `admin_users`:
   ```sql
   SELECT * FROM admin_users WHERE email = 'anstalldens@email.se';
   ```

3. Om användaren inte finns i `admin_users`, skapa den manuellt:
   ```sql
   INSERT INTO admin_users (id, email, role)
   SELECT id, email, 'employee' 
   FROM auth.users 
   WHERE email = 'anstalldens@email.se';
   ```

### Användaren finns inte i employees-tabellen

Om användaren kan logga in men inte visas i schemaläggningen, skapa en post i `employees`:

```sql
INSERT INTO employees (id, name, location, is_active)
SELECT id, email, 'both', true
FROM admin_users
WHERE email = 'anstalldens@email.se'
AND NOT EXISTS (
  SELECT 1 FROM employees WHERE id = admin_users.id
);
```

