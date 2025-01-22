import { Feature, FeatureProps } from "./Feature";
import { Section } from "../atoms/Section/Section";

const featuresList: Omit<FeatureProps, "showCta">[] = [
  {
    category: "Privacy",
    title: "Enterprise-Grade Security",
    description:
      "DataFog uses Azure's PII de-identification service - the same platform trusted by companies working in regulation-heavy industries like healthcare, finance, and legal sectors worldwide.",
    imageUrl: "/feature-1.png",
  },
  {
    category: "Ease of use",
    title: "Built For AI",
    description:
      "Copy-and-open a ChatGPT window with your redacted text copied in a single click. Support for other AI tools and browser extension coming soon for even faster workflow.",
    imageUrl: "/feature-2.png",
  },
];

type FeaturesProps = {
  showCta?: boolean;
};

export const Features = ({ showCta = true }: FeaturesProps) => {
  return (
    <Section flexDir="column">
      {featuresList.map((feature, index) => {
        return (
          <Feature
            key={index}
            category={feature.category}
            title={feature.title}
            description={feature.description}
            imageUrl={feature.imageUrl}
            showCta={showCta}
          />
        );
      })}
    </Section>
  );
};
