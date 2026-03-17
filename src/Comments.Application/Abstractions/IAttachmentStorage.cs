using Comments.Application.DTOs;

namespace Comments.Application.Abstractions;

/// <summary>
/// Контракт збереження вкладень коментаря у вибране сховище.
/// </summary>
public interface IAttachmentStorage
{
    /// <summary>
    /// Зберігає файл вкладення та повертає метадані збереженого ресурсу.
    /// </summary>
    /// <param name="attachment">Запит на завантаження вкладення.</param>
    /// <param name="cancellationToken">Токен скасування.</param>
    /// <returns>Метадані успішно збереженого файлу.</returns>
    Task<StoredAttachment> SaveAsync(AttachmentUploadRequest attachment, CancellationToken cancellationToken);
}

/// <summary>
/// Метадані вкладення після збереження у файловому/об'єктному сховищі.
/// </summary>
/// <param name="FileName">Назва файлу вкладення.</param>
/// <param name="ContentType">MIME-тип файлу.</param>
/// <param name="StoragePath">Внутрішній шлях до файлу у сховищі.</param>
/// <param name="SizeBytes">Розмір файлу у байтах.</param>
public sealed record StoredAttachment(
    string FileName,
    string ContentType,
    string StoragePath,
    long SizeBytes);
