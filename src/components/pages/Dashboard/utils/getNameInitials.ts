export const getNameInitials = (name?: string) => {
  if (!name) return "";
  const nameParts = name.split(" ");
  return nameParts.map((part) => part[0]).join("");
};
