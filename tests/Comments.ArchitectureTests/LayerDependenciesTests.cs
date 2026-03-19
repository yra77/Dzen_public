using System.Reflection;
using Xunit;

namespace Comments.ArchitectureTests;

/// <summary>
/// Architecture smoke-tests that validate allowed project dependency directions.
/// </summary>
public class LayerDependenciesTests
{
    /// <summary>
    /// Domain layer must stay independent from Application, Infrastructure and Api assemblies.
    /// </summary>
    [Fact]
    public void Domain_Should_NotReference_OuterLayers()
    {
        var forbiddenAssemblies = new[]
        {
            "Comments.Application",
            "Comments.Infrastructure",
            "Comments.Api"
        };

        AssertDoesNotReference(forbiddenAssemblies, typeof(Comments.Domain.Entities.Comment).Assembly);
    }

    /// <summary>
    /// Application layer must not depend on Infrastructure and Api implementation details.
    /// </summary>
    [Fact]
    public void Application_Should_NotReference_Infrastructure_Or_Api()
    {
        var forbiddenAssemblies = new[]
        {
            "Comments.Infrastructure",
            "Comments.Api"
        };

        AssertDoesNotReference(forbiddenAssemblies, typeof(Comments.Application.Services.CommentService).Assembly);
    }

    /// <summary>
    /// Infrastructure layer can depend on Application and Domain, but never on Api layer.
    /// </summary>
    [Fact]
    public void Infrastructure_Should_NotReference_Api()
    {
        var forbiddenAssemblies = new[] { "Comments.Api" };

        AssertDoesNotReference(forbiddenAssemblies, typeof(Comments.Infrastructure.Persistence.CommentsDbContext).Assembly);
    }

    /// <summary>
    /// Api layer should be the outermost layer and may depend on all inner layers.
    /// This test ensures the intended direct dependencies remain wired.
    /// </summary>
    [Fact]
    public void Api_Should_Reference_Application_And_Infrastructure()
    {
        var assembly = typeof(Program).Assembly;
        var referenced = assembly.GetReferencedAssemblies().Select(a => a.Name).ToHashSet(StringComparer.Ordinal);

        Assert.Contains("Comments.Application", referenced);
        Assert.Contains("Comments.Infrastructure", referenced);
    }

    /// <summary>
    /// Asserts that an assembly has no direct references to forbidden assemblies.
    /// </summary>
    /// <param name="forbiddenAssemblyNames">Names of assemblies that are prohibited as direct references.</param>
    /// <param name="assembly">Assembly to validate.</param>
    private static void AssertDoesNotReference(IEnumerable<string> forbiddenAssemblyNames, Assembly assembly)
    {
        var referencedAssemblyNames = assembly
            .GetReferencedAssemblies()
            .Select(reference => reference.Name)
            .ToHashSet(StringComparer.Ordinal);

        foreach (var forbiddenName in forbiddenAssemblyNames)
        {
            Assert.DoesNotContain(forbiddenName, referencedAssemblyNames);
        }
    }
}
